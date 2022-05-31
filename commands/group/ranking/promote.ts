import Discord from 'discord.js';
import * as Builders from '@discordjs/builders';
import { BotClient, CommandData, CommandLog } from '../../../utils/classes';
import { config } from '../../../config';

import roblox = require('noblox.js');

export async function run(interaction: Discord.CommandInteraction, client: BotClient, args: any) {
    let logs: CommandLog[] = [];
    let usernames = args["username"].replaceAll(" ", "").split(",");
    let didReply = false;
    for(let i = 0; i < usernames.length; i++) {
        let username = usernames[i];
        let robloxID;
        try {
            robloxID = await roblox.getIdFromUsername(username);
        } catch {
            logs.push({
                username: username,
                status: "Error",
                message: "The username provided is an invalid Roblox username"
            });
            continue;
        }
        username = await roblox.getUsernameFromId(robloxID);
        if(config.verificationChecks) {
            let verificationStatus = await client.preformVerificationChecks(interaction.user.id, "groupMembershipPermissions.changeRank", robloxID);
            if(!verificationStatus) {
                logs.push({
                    username: username,
                    status: "Error",
                    message: "Verification checks have failed"
                });
                continue;
            }
        }
        let rankID = await roblox.getRankInGroup(client.config.groupId, robloxID);
        if(rankID === 0) {
            logs.push({
                username: username,
                status: "Error",
                message: "The user provided is not in the group"
            });
            continue;
        }
        let roles = await roblox.getRoles(client.config.groupId);
        let currentRoleIndex = roles.findIndex(role => role.rank === rankID);
        let currentRole = roles[currentRoleIndex];
        let potentialRole = roles[currentRoleIndex + 1];
        let oldRoleName = currentRole.name;
        if(client.isLockedRole(potentialRole)) {
            for(let i = currentRoleIndex + 1; i < roles.length; i++) {
                potentialRole = roles[i];
                if(!client.isLockedRole(potentialRole)) break;
            }
            if(config.verificationChecks) {
                let authorRobloxID = await client.getRobloxUser(interaction.user.id);
                let groupRole = await roblox.getRankInGroup(client.config.groupId, authorRobloxID);
                if(potentialRole.rank >= groupRole) {
                    logs.push({
                        username: username,
                        status: "Error",
                        message: "Verification checks have failed"
                    });
                    continue;
                }
            }
            let embed = client.embedMaker("Role Locked", `The role(s) above **${username}** is locked, would you like to promote **${username}** to **${potentialRole.name}**?`, "info", interaction.user);
            client.addButton(embed, "yesButton", "Continue", "PRIMARY");
            client.addButton(embed, "noButton", "Cancel", "PRIMARY");
            let msg: Discord.Message;
            if(i === 0) {
                msg = await interaction.editReply(embed) as Discord.Message;
            } else {
                msg = await interaction.channel.send(embed) as Discord.Message;
            }
            didReply = true;
            let filter = (buttonInteraction: Discord.Interaction) => buttonInteraction.isButton() && buttonInteraction.user.id === interaction.user.id;
            let button = await msg.awaitMessageComponent({filter: filter});
            await button.reply({content: "ㅤ"});
            await button.deleteReply();
            if(button.customId === "yesButton") {
                try {
                    await roblox.setRank(client.config.groupId, robloxID, potentialRole.rank);
                } catch(e) {
                    logs.push({
                        username: username,
                        status: "Error",
                        message: e
                    });
                    continue;
                }
            } else {
                logs.push({
                    username: username,
                    status: "Cancelled",
                });
                continue;
            }
            logs.push({
                username: username,
                status: "Success"
            });
            if(config.logging.enabled) {
                await client.logAction(`<@${interaction.user.id}> has promoted **${await roblox.getUsernameFromId(robloxID)}** from **${oldRoleName}** to **${potentialRole.name}**`);
            }
        } else {
            if(config.verificationChecks) {
                let authorRobloxID = await client.getRobloxUser(interaction.user.id);
                let groupRole = await roblox.getRankInGroup(client.config.groupId, authorRobloxID);
                if(potentialRole.rank >= groupRole) {
                    logs.push({
                        username: username,
                        status: "Error",
                        message: "Verification checks have failed"
                    });
                    continue;
                }
            }
            try {
                await roblox.setRank(client.config.groupId, robloxID, potentialRole.rank);
            } catch(e) {
                logs.push({
                    username: username,
                    status: "Error",
                    message: e
                });
                continue;
            }
            logs.push({
                username: username,
                status: "Success"
            });
            if(config.logging.enabled) {
                await client.logAction(`<@${interaction.user.id}> has promoted **${await roblox.getUsernameFromId(robloxID)}** from **${oldRoleName}** to **${potentialRole.name}**`);
            }
        }
    }
    await client.initiateLogEmbedSystem(interaction, logs, didReply);
}

export const slashData = new Builders.SlashCommandBuilder()
    .setName("promote")
    .setDescription("Promotes the inputed user")
    .addStringOption(o => o.setName("username").setDescription("The username of the person that you wish to promote").setRequired(true))

export const commandData: CommandData = {
    category: "Ranking",
    permissions: config.permissions.group.ranking
}