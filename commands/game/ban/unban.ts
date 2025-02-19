import Discord from 'discord.js';
import roblox = require('noblox.js');

import config from '../../../config';

import BotClient from '../../../utils/classes/BotClient';
import RobloxDatastore from '../../../utils/classes/RobloxDatastore';
import CommandHelpers from '../../../utils/classes/CommandHelpers';
import UniverseHandler from '../../../utils/classes/UniverseHandler';

import CommandFile from '../../../utils/interfaces/CommandFile';
import CommandLog from '../../../utils/interfaces/CommandLog';
import ModerationData from '../../../utils/interfaces/ModerationData';

const database = new RobloxDatastore(config);

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
                await database.setModerationData(universeID, robloxID, {banData: {isBanned: false, reason: ""}, muteData: {isMuted: oldData.muteData.isMuted, reason: oldData.muteData.reason, releaseTime: oldData.muteData.releaseTime}, warns: (oldData.warns || [])});
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
            await client.logAction(`<@${interaction.user.id}> has unbanned **${username}** from **${universeName}** with the reason of **${reason}**`);
            continue;
        }
        await client.initiateLogEmbedSystem(interaction, logs);
    },
    slashData: new Discord.SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unbans the inputted user(s) from the game")
    .addStringOption(o => o.setName("universe").setDescription("The universe to perform this action on").setRequired(true).addChoices(...UniverseHandler.parseUniverses() as any))
    .addStringOption(o => o.setName("username").setDescription("The username(s) of the user(s) you wish to unban").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("The reason(s) of the unbans(s)").setRequired(false)) as Discord.SlashCommandBuilder,
    commandData: {
        category: "Ban",
        isEphemeral: false,
        permissions: config.permissions.game.ban,
        hasCooldown: true,
        preformGeneralVerificationChecks: false
    }
}

export default command;