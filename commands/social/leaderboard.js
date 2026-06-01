
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const { prisma } = require('../../database/client');

const { formatNumber } = require('../../utils/helpers');



const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];



module.exports = {

  data: new SlashCommandBuilder()

    .setName('leaderboard')

    .setDescription('View the top players')

    .addStringOption(opt => opt.setName('type').setDescription('Leaderboard type')

      .addChoices(

        { name: 'Level', value: 'level' },

        { name: 'Coins', value: 'coins' },

        { name: 'Monsters', value: 'monsters' },

        { name: 'Bosses', value: 'bosses' },

        { name: 'Prestige', value: 'prestige' },

      )),



  async execute(interaction) {

    await interaction.deferReply();

    const type = interaction.options.getString('type') || 'level';

    const PAGE_SIZE = 10;

    let page = 0;



    const orderMap = {

      level: { level: 'desc', prestige: 'desc' },

      coins: { coins: 'desc' },

      monsters: { monstersKilled: 'desc' },

      bosses: { bossesKilled: 'desc' },

      prestige: [{ prestige: 'desc' }, { level: 'desc' }],

    };



    const getPlayers = async (pg) => {

      return await prisma.player.findMany({

        orderBy: orderMap[type],

        take: PAGE_SIZE,

        skip: pg * PAGE_SIZE,

        select: { username: true, level: true, coins: true, monstersKilled: true, bossesKilled: true, prestige: true, title: true },

      });

    };



    const generateEmbed = async (pg) => {

      const players = await getPlayers(pg);

      const valueMap = {

        level: p => `Level **${p.level}**${p.prestige > 0 ? ` ✦${p.prestige}` : ''}`,

        coins: p => `💰 **${formatNumber(p.coins)}**`,

        monsters: p => `👾 **${formatNumber(p.monstersKilled)}**`,

        bosses: p => `💀 **${p.bossesKilled}**`,

        prestige: p => `✦ Prestige **${p.prestige}** — Level **${p.level}**`,

      };

      const lines = players.map((p, i) => `${MEDALS[pg * PAGE_SIZE + i] || `${pg * PAGE_SIZE + i + 1}.`} **${p.username}** — *${p.title}*\n  └ ${valueMap[type](p)}`);

      

      return new EmbedBuilder()

        .setColor(0xFFD700)

        .setTitle(`🏆 ${type.toUpperCase()} Leaderboard`)

        .setDescription(lines.join('\n\n') || 'No players found.')

        .setFooter({ text: `Page ${pg + 1} / 5` });

    };



    const row = new ActionRowBuilder().addComponents(

      new ButtonBuilder().setCustomId('prev').setLabel('Previous').setStyle(ButtonStyle.Primary).setDisabled(true),

      new ButtonBuilder().setCustomId('next').setLabel('Next').setStyle(ButtonStyle.Primary)

    );



    const response = await interaction.editReply({ embeds: [await generateEmbed(page)], components: [row] });

    const collector = response.createMessageComponentCollector({ time: 60000 });



    collector.on('collect', async i => {

      if (i.user.id !== interaction.user.id) return i.reply({ content: 'Not your menu!', ephemeral: true });

      page = i.customId === 'next' ? page + 1 : page - 1;

      row.components[0].setDisabled(page === 0);

      row.components[1].setDisabled(page === 4);

      await i.update({ embeds: [await generateEmbed(page)], components: [row] });

    });

  },

};

