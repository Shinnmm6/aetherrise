async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const redis = getRedis();

    if (sub === 'give_coins') {
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const player = await getOrCreatePlayer(target.id, target.username);
      await awardCoins(player.id, amount);
      try { await redis.del(`player:${target.id}`); } catch (e) {}
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Gave **${formatNumber(amount)}** coins to **${target.username}**.`)] });
    }

    if (sub === 'give_item') {
      const target = interaction.options.getUser('user');
      const item = interaction.options.getString('item');
      const qty = interaction.options.getInteger('quantity') || 1;
      const player = await getOrCreatePlayer(target.id, target.username);
      await addItem(player.id, item, qty);
      try { await redis.del(`inventory:${target.id}`); } catch (e) {}
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Gave **${qty}x ${item}** to **${target.username}**.`)] });
    }

    // ADD THIS: Missing handler for give_xp
    if (sub === 'give_xp') {
      const { awardXP } = require('../../managers/playerManager'); // Make sure this is imported
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const player = await getOrCreatePlayer(target.id, target.username);
      const { levelUps, newLevel } = await awardXP(player.id, amount);
      return interaction.editReply({ 
        embeds: [new EmbedBuilder().setColor(0x00C851).setDescription(`✅ Gave **${formatNumber(amount)}** XP to **${target.username}**. ${levelUps.length ? `Leveled up to ${newLevel}!` : ''}`)] 
      });
    }
    
    // Safety catch: If a subcommand is added but not handled, reply so it doesn't hang
    return interaction.editReply({ content: 'This subcommand is not implemented yet.' });
  },
