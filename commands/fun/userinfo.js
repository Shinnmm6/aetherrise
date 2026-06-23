const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('See info about a user and mutual servers')
        .addUserOption(option => 
            option.setName('user')
            .setDescription('The user to get info about')),
    
    async execute(interaction) {
        // No deferReply here because interactionCreate.js already does it!

        const member = interaction.options.getMember('user') || interaction.member;
        const user = await member.user.fetch(true);

        const mutualGuilds = [];
        interaction.client.guilds.cache.forEach(guild => {
            if (guild.members.cache.has(user.id)) {
                mutualGuilds.push(guild.name);
            }
        });

        const embed = new EmbedBuilder()
            .setTitle(`User Info: ${user.username}`)
            .setThumbnail(user.displayAvatarURL())
            .setColor(member.displayHexColor || '#2b2d31')
            .addFields(
                { name: 'Username', value: user.username, inline: true },
                { name: 'ID', value: user.id, inline: true },
                { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true },
                { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>`, inline: true },
                { name: 'Roles', value: member.roles.cache.map(r => r.name).join(', ').replace('@everyone, ', '').replace('@everyone', '') || 'None' },
                { name: 'Mutual Servers', value: mutualGuilds.join(', ') || 'No mutual servers found' }
            )
            .setFooter({ text: `Requested by ${interaction.user.username}` });

        // Since it's already deferred by the main handler, we just edit the reply
        await interaction.editReply({ embeds: [embed] });
    },
};
