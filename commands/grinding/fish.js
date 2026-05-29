const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');
const { getPlayerStats, awardCoins, awardXP, useEnergy, regenEnergy } = require('../../managers/playerManager');
const { addItem } = require('../../managers/playerManager');
const { WORLDS, RARITIES, ITEMS } = require('../../config/gameData');
const { randomFrom, randomInt, formatNumber } = require('../../utils/helpers');

const COOLDOWN = 45;

const FISH_TYPES = [
  { id: 'small_fish',    name: 'Small Fish',      emoji: '🐟', rarity: 'common',    value: 20,   xp: 15 },
  { id: 'salmon',        name: 'Salmon',           emoji: '🐠', rarity: 'common',    value: 45,   xp: 25 },
  { id: 'tuna',          name: 'Tuna',             emoji: '🐡', rarity: 'uncommon',  value: 120,  xp: 50 },
  { id: 'swordfish',     name: 'Swordfish',        emoji: '⚔️', rarity: 'rare',      value: 400,  xp: 100 },
  { id: 'golden_fish',   name: 'Golden Fish',      emoji: '✨', rarity: 'epic',      value: 2000, xp: 300 },
  { id: 'void_eel',      name: 'Void Eel',         emoji: '⚫', rarity: 'void',      value: 30000, xp: 2000 },
  { id: 'ancient_carp',  name: 'Ancient Carp',     emoji: '🌌', rarity: 'legendary', value: 8000, xp: 800 },
  { id: 'trash',         name: 'Old Boot',         emoji: '👢', rarity: 'common',    value: 2,    xp: 5 },
  { id: 'treasure_chest',name: 'Sunken Chest',     emoji: '📦', rarity: 'rare',      value: 1500, xp: 200, isChest: true },
];

const FISH_WEIGHTS = {
  common: 5000, uncommon: 2000, rare: 800, epic: 200, legendary: 50, void: 5,
};

function rollFish(luckBonus = 0) {
  const total = Object.values(FISH_WEIGHTS).reduce((s, w) => s + w, 0);
  let roll = Math.random() * total * (1 - luckBonus * 0.0005);
  for (const fish of FISH_TYPES) {
    const w = FISH_WEIGHTS[fish.rarity] || 1000;
    roll -= w;
    if (roll <= 0) return fish;
  }
  return FISH_TYPES[0];
}

// Mini-game: react to the button in time
module.exports = {
  data: new SlashCommandBuilder()
    .setName('fish')
    .setDescription('Cast your line and catch fish! React fast when something bites! (45s cooldown)'),
  cooldown: COOLDOWN,

  async execute(interaction) {
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);
    await regenEnergy(player);

    if (player.energy < 3) {
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xFF8800).setDescription(`⚡ Need **3 energy** to fish. You have **${player.energy}**.`)],
        ephemeral: true,
      });
    }

    await useEnergy(player.id, 3);
    const stats = await getPlayerStats(player.id);

    // Casting phase
    const castEmbed = new EmbedBuilder()
      .setColor(0x0088FF)
      .setTitle('🎣 Fishing...')
      .setDescription('*You cast your line into the water...*\n\n**Wait for something to bite!**')
      .setFooter({ text: 'React quickly when the fish bites!' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('fish_reel').setLabel('🎣 REEL IT IN!').setStyle(ButtonStyle.Success).setDisabled(true)
    );

    const msg = await interaction.editReply({ embeds: [castEmbed], components: [row], fetchReply: true });

    // Random wait 2–6 seconds before fish bites
    const waitTime = randomInt(2000, 6000);

    setTimeout(async () => {
      const biteEmbed = new EmbedBuilder()
        .setColor(0xFF8800)
        .setTitle('🎣 SOMETHING BIT! REEL IT IN!')
        .setDescription('⚡ **QUICK! Click the button!** ⚡')
        .setFooter({ text: 'You have 3 seconds!' });

      const activeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('fish_reel').setLabel('🎣 REEL IT IN!').setStyle(ButtonStyle.Success).setDisabled(false)
      );

      try {
        await msg.edit({ embeds: [biteEmbed], components: [activeRow] });
      } catch { return; }

      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id && i.customId === 'fish_reel',
        time: 3000,
        max: 1,
      });

      collector.on('collect', async (btn) => {
        await btn.deferUpdate();
        const fish = rollFish(stats.luckBonus);
        const r = RARITIES[fish.rarity];
        const coinValue = Math.floor(fish.value * stats.coinBonus * world_mult(player.world));
        const xpGain = Math.floor(fish.xp * stats.xpBonus);

        await awardCoins(player.id, coinValue);
        const { levelUps, newLevel } = await awardXP(player.id, xpGain);

        if (fish.isChest) {
          await addItem(player.id, 'common_crate', 1);
        }

        const isRare = ['epic', 'legendary', 'mythic', 'void', 'celestial'].includes(fish.rarity);

        const resultEmbed = new EmbedBuilder()
          .setColor(r?.color || 0x0088FF)
          .setTitle(`${fish.emoji} You caught a ${fish.name}!`)
          .setDescription(isRare ? `🌟 **INCREDIBLE CATCH!** 🌟` : '*Nice catch!*')
          .addFields({
            name: '═══ Catch ═══',
            value: [
              `${r?.emoji} **${fish.name}** — ${r?.name}`,
              `💰 **${formatNumber(coinValue)}** coins`,
              `✨ **+${xpGain}** XP`,
              fish.isChest ? `📦 Found a **Common Crate** inside!` : null,
              levelUps.length ? `🎉 **Level Up → ${newLevel}!**` : null,
            ].filter(Boolean).join('\n'),
          })
          .setFooter({ text: 'Next cast in 45 seconds' });

        await btn.editReply({ embeds: [resultEmbed], components: [] });
      });

      collector.on('end', async (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
          try {
            await msg.edit({
              embeds: [new EmbedBuilder().setColor(0x666666).setTitle('🎣 The fish got away!').setDescription('*Too slow! You missed it.*')],
              components: [],
            });
          } catch {}
        }
      });
    }, waitTime);
  },
};

function world_mult(world) {
  const mults = { forest: 1, desert: 1.5, frozen: 2.5, inferno: 4, void: 8, celestial: 20 };
  return mults[world] || 1;
}
