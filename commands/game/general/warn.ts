import Discord from 'discord.js';
import roblox = require('noblox.js');

import config from '../../../config';

import BotClient from '../../../utils/classes/BotClient';
import MessagingService from '../../../utils/classes/MessagingService';
import RobloxDatastore from '../../../utils/classes/RobloxDatastore';
import CommandHelpers from '../../../utils/classes/CommandHelpers';
import UniverseHandler from '../../../utils/classes/UniverseHandler';

import CommandFile from '../../../utils/interfaces/CommandFile';
import CommandLog from '../../../utils/interfaces/CommandLog';
import ModerationData from '../../../utils/interfaces/ModerationData';

const database = new RobloxDatastore(config);
const messaging = new MessagingService(config);

const command: CommandFile = {
    run: async(interaction: Discord.CommandInteraction<Discord.CacheType>, client: BotClient, args: any): Promise<any> => {
        let logs: CommandLog[] = [];
        let usernames = args["username"].replaceAll(" ", "").split(",");
        let reasonData = CommandHelpers.parseReasons(usernames, args["reason"]);
        if(reasonData.didError) {
            let embed = client.embedMaker({title: "Argument Error", description: `You inputted an unequal amount of usernames and reasons, please make sure that these amounts are equal, or, if you wish to apply one reason to multiple people, only put that reason for the reason argument`, type: "error", author: interaction.user})
            return await interaction.editReply({embeds: [embed]});
        }
        let reasons = reasonData.parsedReasons;
        let universeName = args["universe"];
        let universeID = UniverseHandler.getIDFromName(universeName);
        for(let i = 0; i < usernames.length; i++) {
            let username = usernames[i];
            let reason = reasons[i];
            let robloxID = await roblox.getIdFromUsername(username) as number;
            if(!robloxID) {
                logs.push({
                    username: username,
                    status: "Error",
                    message: "The username provided is an invalid Roblox username"
                });
                continue;
            }
            username = await roblox.getUsernameFromId(robloxID);
            try {
                let oldData: ModerationData;
                try {
                    oldData = await database.getModerationData(universeID, robloxID);
                } catch(e) {
                    if((e.toString() as string).indexOf("NOT_FOUND") === -1) {
                        logs.push({
                            username: username,
                            status: "Error",
                            message: e
                        });
                        continue;
                    } else {
                        oldData = {
                            banData: { // Gets overridden in the setModerationData call
                                isBanned: false,
                                reason: ""
                            },
                            muteData: {
                                isMuted: false,
                                reason: ""
                            },
                            warns: []
                        }
                    }
                }
                if(!oldData.warns) oldData.warns = [];
                oldData.warns.push({
                    author: interaction.user.tag,
                    reason: reason,
                    dateAssigned: Date.now()
                });
                await database.setModerationData(universeID, robloxID, {banData: {isBanned: oldData.banData.isBanned, reason: oldData.banData.reason, releaseTime: oldData.banData.releaseTime}, muteData: {isMuted: oldData.muteData.isMuted, reason: oldData.muteData.reason, releaseTime: oldData.muteData.releaseTime}, warns: oldData.warns});
            } catch(e) {
                logs.push({
                    username: username,
                    status: "Error",
                    message: e
                });
                continue;
            }
            let didNotifyError = false;
            try {
                await messaging.sendMessage(universeID, "Warn", {username: username, reason: reason});
            } catch(e) {
                didNotifyError = true;
                logs.push({
                    username: username,
                    status: "Error",
                    message: `Although this user's warn got registered, I couldn't notify them because of the following error: ${e}`
                });
            }
            if(!didNotifyError) {
                logs.push({
                    username: username,
                    status: "Success"
                });
            }
            await client.logAction(`<@${interaction.user.id}> has warned **${username}** in **${universeName}** for the reason of **${reason}**`);
            continue;
        }
        await client.initiateLogEmbedSystem(interaction, logs);
    },
    slashData: new Discord.SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warns a user(s)")
    .addStringOption(o => o.setName("universe").setDescription("The universe to perform this action on").setRequired(true).addChoices(...UniverseHandler.parseUniverses() as any))
    .addStringOption(o => o.setName("username").setDescription("The username(s) of the user(s) you wish to warn").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("The reason(s) of the warn(s)").setRequired(false)) as Discord.SlashCommandBuilder,
    commandData: {
        category: "General Game",
        isEphemeral: false,
        permissions: config.permissions.game.general,
        hasCooldown: true,
        preformGeneralVerificationChecks: false
    }
}

export default command;