const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'userinfo',
    description: 'See info about a user and mutual servers',
    async execute(message, args) {
        // Fetch the member, or the author
        const member = message.mentions.members.first() || message.member;
        const user = await member.user.fetch(true); // Fetch full user data

        // Get mutual guilds (servers where the bot and the user both are)
        const mutualGuilds = [];
        message.client.guilds.cache.forEach(guild => {
            if (guild.members.cache.has(user.id)) {
                mutualGuilds.push(guild.name);
            }
        });

        const embed = new EmbedBuilder()
            .setTitle(`User Info: ${user.username}`)
            .setThumbnail(user.displayAvatarURL())
            .setColor(member.displayHexColor)
            .addFields(
                { name: 'Username', value: user.username, inline: true },
                { name: 'ID', value: user.id, inline: true },
                { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true },
                { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>`, inline: true },
                { name: 'Roles', value: member.roles.cache.map(r => r.name).join(', ').replace('@everyone, ', '') || 'None' },
                { name: 'Mutual Servers', value: mutualGuilds.join(', ') || 'No mutual servers found' }
            )
            .setFooter({ text: `Requested by ${message.author.username}` });

        message.reply({ embeds: [embed] });
    },
};
