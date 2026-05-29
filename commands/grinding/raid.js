const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getOrCreatePlayer, prisma } = require('../../database/client');
const { getPlayerStats, awardCoins, awardXP } = require('../../managers/playerManager');
const { rollBossDrops } = require('../../managers/lootManager');
const { WORLDS, RARITIES } = require('../../config/gameData');
const { randomInt, formatNumber, progressBar } = require('../../utils/helpers');

const COOLDOWN = 7200; // 2 hours
const RAID_WAIT = 60_000; // 60s to join

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raid')
    .setDescription('Start a co-op raid! Others can join for 60 seconds. (2h cooldown)'),
  cooldown: COOLDOWN,

  async execute(interaction) {
    const player = await getOrCreatePlayer(interaction.user.id, interaction.user.username);
    const world = WORLDS[player.world] || WORLDS.forest;
    const boss = world.boss;

    const raiders = new Map();
    raiders.set(interaction.user.id, { user: interaction.user, player });

    const buildLobbyEmbed = () => new EmbedBuilder()
      .setColor(0xFF0044)
      .setTitle(`⚔️ RAID LOBBY: ${boss.emoji} ${boss.name}`)
      .setDescription(`*${world.name} trembles as a powerful boss awakens...*\n\n**Click Join to enter the raid!**`)
      .addFields(
        { name: '👥 Raiders', value: Array.from(raiders.values()).map(r => `• ${r.user.displayName}`).join('\n'), inline: true },
        { name: '💀 Boss HP', value: formatNumber(boss.hp), inline: true },
        { name: '⏳ Starting in', value: '60 seconds', inline: true },
      )
      .setFooter({ text: 'More raiders = more damage!' });

    const joinRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('raid_join').setLabel('⚔️ Join Raid!').setStyle(ButtonStyle.Danger),
    );

    const msg = await interaction.reply({ embeds: [buildLobbyEmbed()], components: [joinRow], fetchReply: true });

    const joinCollector = msg.createMessageComponentCollector({
      filter: i => i.customId === 'raid_join',
      time: RAID_WAIT,
    });

    joinCollector.on('collect', async (btn) => {
      await btn.deferUpdate();
      if (raiders.has(btn.user.id)) return;
      const joinPlayer = await getOrCreatePlayer(btn.user.id, btn.user.username);
      raiders.set(btn.user.id, { user: btn.user, player: joinPlayer });
      await btn.editReply({ embeds: [buildLobbyEmbed()] });
    });

    joinCollector.on('end', async () => {
      // Start the raid
      const raiderList = Array.from(raiders.values());
      let bossHp = boss.hp * Math.max(1, raiderList.length * 0.5); // scales with players
      const bossMaxHp = bossHp;
      const rounds = [];
      let totalDmg = 0;

      // Simulate raid combat (simplified: each raider contributes)
      for (let round = 0; round < 10 && bossHp > 0; round++) {
        let roundDmg = 0;
        for (const { player: rp } of raiderList) {
          const stats = await getPlayerStats(rp.id);
          const atk = randomInt(stats.atk, Math.floor(stats.atk * 1.5)) * (1 + raiderList.length * 0.1);
          roundDmg += atk;
        }
        bossHp -= roundDmg;
        totalDmg += roundDmg;
        rounds.push(`Round ${round + 1}: **${formatNumber(roundDmg)}** total damage`);
      }

      const won = bossHp <= 0;

      if (won) {
        // Distribute rewards
        const baseCoins = randomInt(boss.coins[0], boss.coins[1]);
        const baseXp = boss.xp;
        const raidLines = [];

        for (const { user, player: rp } of raiderList) {
          const stats = await getPlayerStats(rp.id);
          const coins = Math.floor(baseCoins * stats.coinBonus);
          const xp = Math.floor(baseXp * stats.xpBonus);
          await awardCoins(rp.id, coins);
          await awardXP(rp.id, xp);
          await prisma.player.update({ where: { id: rp.id }, data: { bossesKilled: { increment: 1 } } });
          const drops = await rollBossDrops(rp.id, rp.world, stats.luckBonus);
          raidLines.push(`**${user.displayName}**: 💰${formatNumber(coins)} | ✨${formatNumber(xp)}XP | ${drops.length} drops`);
        }

        const winEmbed = new EmbedBuilder()
          .setColor(0xFFD700)
          .setTitle(`🏆 RAID VICTORY! ${boss.emoji} ${boss.name} DEFEATED!`)
          .setDescription(rounds.slice(-4).join('\n'))
          .addFields(
            { name: '═══ Raid Rewards ═══', value: raidLines.join('\n') },
            { name: '💥 Total Damage', value: formatNumber(totalDmg) },
          );

        try { await msg.edit({ embeds: [winEmbed], components: [] }); } catch {}
      } else {
        const loseEmbed = new EmbedBuilder()
          .setColor(0x333333)
          .setTitle(`💀 Raid Failed! ${boss.emoji} ${boss.name} was too powerful!`)
          .setDescription(rounds.slice(-4).join('\n'))
          .addFields({ name: 'Remaining HP', value: formatNumber(Math.max(0, bossHp)) });

        try { await msg.edit({ embeds: [loseEmbed], components: [] }); } catch {}
      }
    });
  },
};
