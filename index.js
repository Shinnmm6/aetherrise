
require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

const OpenAI = require('openai');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { initDatabase, prisma } = require('./database/client');
const { initRedis } = require('./database/redis');
const { sendGhostMessage } = require('./utils/ghost');
const { handleRandomReply } = require('./utils/responder');
const chalk = require('chalk');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();
client.cooldowns = new Collection();
client.activeBattles = new Map();
client.activeDungeons = new Map();
client.globalBoss = null;

// ========================================
// GROQ AI CONFIGURATION
// ========================================

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const openai = GROQ_API_KEY
  ? new OpenAI({
      apiKey: GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    })
  : null;

// Supported model candidates with automatic fallback.
// Override the model list here if Groq changes availability.
const AI_MODELS = [
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
];

if (!GROQ_API_KEY) {
  console.warn(
    '⚠️ GROQ_API_KEY is missing. AI chat will be disabled.'
  );
}

// ========================================
// CHANNEL CONFIGURATION
// ========================================

const REPORTS_CHANNEL_ID =
  process.env.REPORTS_CHANNEL_ID || '1543934020843474995';

const SUGGESTIONS_CHANNEL_ID =
  process.env.SUGGESTIONS_CHANNEL_ID || REPORTS_CHANNEL_ID;

const SOURCE_CHANNEL_ID = '1466400064913150158';
const DESTINATION_CHANNEL_ID = '1516293358635716610';

const ALL_LINKS_REGEX =
  /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(discord\.(gg|io|me|li)\/[^\s]+)/i;

// ========================================
// DATABASE PREFIX
// ========================================

async function getPrefix(guildId) {
  try {
    const settings = await prisma.$queryRaw`
      SELECT prefix
      FROM "settings"
      WHERE "guildId" = ${guildId}
      LIMIT 1
    `;

    return settings?.length > 0 ? settings[0].prefix : '!';
  } catch (error) {
    console.error('Failed to get prefix:', error.message);
    return '!';
  }
}

// ========================================
// MESSAGE HANDLER
// ========================================

client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot || !message.guild) return;

    // 1. Anti-link and anti-invite filter
    if (
      !message.member?.permissions.has(
        PermissionFlagsBits.ManageMessages
      )
    ) {
      if (ALL_LINKS_REGEX.test(message.content)) {
        try {
          await message.delete();

          const warning = await message.channel.send(
            `⚠️ ${message.author}, posting links is not allowed in this server!`
          );

          setTimeout(() => {
            warning.delete().catch(() => {});
          }, 5000);

          return;
        } catch (error) {
          console.error('Failed to delete link:', error);
        }
      }
    }

    // 2. AI chat integration
    if (openai && client.user && message.mentions.has(client.user)) {
      const cleanPrompt = message.content
        .replace(/<@!?\d+>/g, '')
        .trim();

      if (cleanPrompt) {
        await message.channel.sendTyping();

        let aiReply = null;

        for (const modelCandidate of AI_MODELS) {
          try {
            const response = await openai.chat.completions.create({
              model: modelCandidate,
              messages: [
                {
                  role: 'system',
                  content:
                    'You are AetherRise, the official RPG game and utility assistant bot. Keep answers concise, helpful, and gamer-oriented.',
                },
                {
                  role: 'user',
                  content: cleanPrompt,
                },
              ],
              max_tokens: 300,
            });

            aiReply =
              response.choices?.[0]?.message?.content?.trim() || null;

            if (aiReply) {
              console.log(
                `✅ AI response generated using ${modelCandidate}`
              );
              break;
            }
          } catch (error) {
            console.warn(
              `Model ${modelCandidate} failed: ${error.message}. Trying next fallback...`
            );
          }
        }

        if (aiReply) {
          return await message.reply({
            content: aiReply.slice(0, 2000),
            allowedMentions: { repliedUser: false },
          });
        }

        return await message.reply(
          '⚠️ Sorry, I could not generate a response right now. Please try again later.'
        );
      }
    }

    // 3. Channel forwarding
    if (message.channel.id === SOURCE_CHANNEL_ID) {
      const destinationChannel =
        message.client.channels.cache.get(DESTINATION_CHANNEL_ID);

      if (destinationChannel) {
        const content =
          `**${message.author.username}**: ${message.content}`;

        await destinationChannel
          .send({
            content: content.slice(0, 2000),
            files: message.attachments.map(
              (attachment) => attachment.url
            ),
          })
          .catch(console.error);
      }
    }

    // 4. Existing prefix handling
    const prefix = await getPrefix(message.guild.id);

    if (message.content.startsWith(prefix)) {
      // Existing prefix command logic
    }

    // 5. Keyword replies
    if (message.content.toLowerCase().includes('xeno')) {
      await message.reply(
        'Xeno is sucks and for dumb users like you'
      );
    }

    if (message.content.toLowerCase().includes('karunosob')) {
      await message.reply(
        'karunosob is femboy i sense it 100%'
      );
    }

    await handleRandomReply(message);
  } catch (error) {
    console.error('Message handler error:', error);
  }
});

// ========================================
// INTERACTION HANDLERS
// ========================================

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // Slash commands
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'setup-reporter') {
        const embed = new EmbedBuilder()
          .setTitle('🛡️ Developer Reporting Panel')
          .setDescription(
            'Welcome to the Server Reporter! Use the button below to submit structured reports directly to the developers.\n\n' +
              '**Categories:**\n' +
              '• **Exploiter:** Cheating, malicious scripts, or game exploits.\n' +
              '• **Bugs:** Broken mechanics, map glitches, or gameplay bugs.'
          )
          .setColor(0x0099ff)
          .setFooter({ text: 'AetherRise Dev Tools' });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('create_report_btn')
            .setLabel('Create Report')
            .setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({
          embeds: [embed],
          components: [row],
        });

        return;
      }

      if (interaction.commandName === 'setup-suggestion') {
        const embed = new EmbedBuilder()
          .setTitle('💡 Player Suggestions Panel')
          .setDescription(
            'Have an idea to improve the game or server? Click the button below to submit your suggestion to the developers and community!\n\n' +
              '**Guidelines:**\n' +
              '• Be specific with your idea.\n' +
              '• Explain why should we add it.\n' +
              '• Keep suggestions good.\n' +
              '• Must be 5 reacts'
          )
          .setColor(0x00ff7f)
          .setFooter({ text: 'AetherRise Community Feedback' });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('create_suggestion_btn')
            .setLabel('Submit Suggestion')
            .setStyle(ButtonStyle.Success)
        );

        await interaction.reply({
          embeds: [embed],
          components: [row],
        });

        return;
      }
    }

    // Buttons
    if (interaction.isButton()) {
      if (interaction.customId === 'create_report_btn') {
        const modal = new ModalBuilder()
          .setCustomId('report_modal')
          .setTitle('Submit a Developer Report');

        const categoryInput = new TextInputBuilder()
          .setCustomId('report_category')
          .setLabel('Category (Exploiter OR Bug)')
          .setPlaceholder('Type "Exploiter" or "Bug"')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const targetInput = new TextInputBuilder()
          .setCustomId('report_target')
          .setLabel('Game Username / Subject')
          .setPlaceholder(
            'Username of exploiter or system name of bug'
          )
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const detailsInput = new TextInputBuilder()
          .setCustomId('report_details')
          .setLabel('Description & Evidence Links')
          .setPlaceholder(
            'Provide a detailed description and video/image links...'
          )
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(categoryInput),
          new ActionRowBuilder().addComponents(targetInput),
          new ActionRowBuilder().addComponents(detailsInput)
        );

        await interaction.showModal(modal);
        return;
      }

      if (interaction.customId === 'create_suggestion_btn') {
        const modal = new ModalBuilder()
          .setCustomId('suggestion_modal')
          .setTitle('Submit a Player Suggestion');

        const titleInput = new TextInputBuilder()
          .setCustomId('suggestion_title')
          .setLabel('Suggestion Title')
          .setPlaceholder(
            'e.g., Add New Things, Rebalance Or Adjustment'
          )
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const categoryInput = new TextInputBuilder()
          .setCustomId('suggestion_category')
          .setLabel('Category')
          .setPlaceholder(
            'e.g., Gameplay, UI, Economy, Cosmetics'
          )
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const detailsInput = new TextInputBuilder()
          .setCustomId('suggestion_details')
          .setLabel('Detailed Explanation & Rationale')
          .setPlaceholder(
            'Describe your idea in detail and explain why it should be added...'
          )
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(titleInput),
          new ActionRowBuilder().addComponents(categoryInput),
          new ActionRowBuilder().addComponents(detailsInput)
        );

        await interaction.showModal(modal);
        return;
      }
    }

    // Modal submissions
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'report_modal') {
        await interaction.deferReply({ ephemeral: true });

        const category = interaction.fields
          .getTextInputValue('report_category')
          .trim();

        const target = interaction.fields
          .getTextInputValue('report_target')
          .trim();

        const details = interaction.fields
          .getTextInputValue('report_details')
          .trim();

        const isExploiter =
          category.toLowerCase().includes('exploit');

        const embedColor = isExploiter ? 0xff0000 : 0xffa500;

        const categoryTag = isExploiter
          ? '🚨 EXPLOITER REPORT'
          : '🐛 BUG REPORT';

        try {
          const channel = await interaction.client.channels
            .fetch(REPORTS_CHANNEL_ID)
            .catch(() => null);

          if (!channel || !channel.isTextBased()) {
            return await interaction.editReply({
              content: '❌ Developer report channel not found.',
            });
          }

          const reportEmbed = new EmbedBuilder()
            .setTitle(`[${categoryTag}] ${target}`.slice(0, 256))
            .setColor(embedColor)
            .addFields(
              {
                name: 'Submitted By',
                value:
                  `${interaction.user.tag} (\`${interaction.user.id}\`)`,
                inline: true,
              },
              {
                name: 'Target / Subject',
                value: target.slice(0, 1024),
                inline: true,
              },
              {
                name: 'Category',
                value: category.slice(0, 1024),
                inline: true,
              },
              {
                name: 'Description & Proof',
                value: details.slice(0, 4000) || 'No details provided.',
              }
            )
            .setTimestamp();

          await channel.send({ embeds: [reportEmbed] });

          await interaction.editReply({
            content:
              '✅ Your report has been sent to the developers. Thank you!',
          });
        } catch (error) {
          console.error('Report submission error:', error);

          await interaction.editReply({
            content:
              '❌ An error occurred while submitting your report.',
          }).catch(() => {});
        }

        return;
      }

      if (interaction.customId === 'suggestion_modal') {
        await interaction.deferReply({ ephemeral: true });

        const title = interaction.fields
          .getTextInputValue('suggestion_title')
          .trim();

        const category = interaction.fields
          .getTextInputValue('suggestion_category')
          .trim();

        const details = interaction.fields
          .getTextInputValue('suggestion_details')
          .trim();

        try {
          const channel = await interaction.client.channels
            .fetch(SUGGESTIONS_CHANNEL_ID)
            .catch(() => null);

          if (!channel || !channel.isTextBased()) {
            return await interaction.editReply({
              content: '❌ Suggestions channel not found.',
            });
          }

          const suggestionEmbed = new EmbedBuilder()
            .setTitle(
              `💡 [${category.toUpperCase()}] ${title}`.slice(0, 256)
            )
            .setColor(0x00ff7f)
            .addFields(
              {
                name: 'Suggested By',
                value:
                  `${interaction.user.tag} (\`${interaction.user.id}\`)`,
                inline: true,
              },
              {
                name: 'Category',
                value: category.slice(0, 1024),
                inline: true,
              },
              {
                name: 'Details & Rationale',
                value:
                  details.slice(0, 4000) || 'No details provided.',
              }
            )
            .setTimestamp()
            .setFooter({
              text: 'Community Feedback — React below to vote!',
            });

          const msg = await channel.send({
            embeds: [suggestionEmbed],
          });

          await msg.react('👍');
          await msg.react('👎');

          await interaction.editReply({
            content:
              '✅ Your suggestion has been submitted and posted for community voting!',
          });
        } catch (error) {
          console.error('Suggestion submission error:', error);

          await interaction.editReply({
            content:
              '❌ An error occurred while submitting your suggestion.',
          }).catch(() => {});
        }
      }
    }
  } catch (error) {
    console.error('Interaction handler error:', error);

    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An unexpected error occurred.',
        ephemeral: true,
      }).catch(() => {});
    }
  }
});

// ========================================
// START BOT
// ========================================

async function main() {
  console.log(
    chalk.magenta(`
  ╔═══════════════════════════════════════╗
  ║       ✨ AetherRise RPG Bot ✨         ║
  ║      The World Awakens Once More      ║
  ╚═══════════════════════════════════════╝
  `)
  );

  if (!process.env.DISCORD_TOKEN) {
    throw new Error('DISCORD_TOKEN is missing from the environment.');
  }

  await initDatabase();
  await initRedis();
  await loadCommands(client);
  await loadEvents(client);

  setInterval(() => {
    Promise.resolve(sendGhostMessage(client)).catch((error) => {
      console.error('Ghost message error:', error);
    });
  }, 60 * 60 * 1000);

  await client.login(process.env.DISCORD_TOKEN);
}

main().catch((error) => {
  console.error('Failed to start AetherRise:', error);
  process.exitCode = 1;
});

module.exports = { client };
