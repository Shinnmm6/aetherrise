const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function getVoteRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('Vote for Bonuses!')
            .setURL('https://top.gg/bot/1247705702177308692/vote')
            .setStyle(ButtonStyle.Link)
    );
}

module.exports = { getVoteRow };
