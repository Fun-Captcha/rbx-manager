import Discord from 'discord.js';

import AntiAbuseAction from './AntiAbuseAction';
import LoggingConfig from './LoggingConfig';
import RewardEntry from './RewardEntry';

export default interface BotConfig {
    DISCORD_TOKEN: string,
    ROBLOX_USERNAME: string,
    ROBLOX_PASSWORD: string,
    ROBLOX_COOKIE: string,
    ROBLOX_API_KEY: string,
    ROVER_API_KEY: string,
    WEB_API_KEY: string,
    groupIds: number[],
    permissions: {
        all: string[],
        group: {
            shout: string[],
            ranking: string[],
            joinrequests: string[],
            user: string[],
            xp: string[]
        },
        game: {
            general: string[]
            broadcast: string[],
            kick: string[],
            ban: string[],
            shutdown: string[],
            datastore: string[],
            execution: string[],
            jobIDs: string[],
            lock: string[],
            mute: string[]
        }
    },
    antiAbuse: {
        enabled: boolean,
        thresholds: {
            ranks: number,
            exiles: number
        },
        actions: {
            ranks: AntiAbuseAction,
            exiles: AntiAbuseAction
        }
    },
    xpSystem: {
        enabled: boolean,
        rewards: RewardEntry[],
        earnings: {
            messages: number,
            reactions: number
        }
    },
    counting: {
        enabled: boolean,
        goal: number,
        loggingChannel: string
    },
    logging: {
        audit: LoggingConfig,
        shout: LoggingConfig,
        command: LoggingConfig,
        antiAbuse: LoggingConfig,
        sales: LoggingConfig,
        xp: LoggingConfig,
    },
    embedColors: {
        info: Discord.ColorResolvable,
        success: Discord.ColorResolvable,
        error: Discord.ColorResolvable
    },
    debug?: boolean,
    defaultCooldown: number,
    cooldownOverrides: {[key: string]: number},
    suspensionRank: number,
    universes: number[],
    datastoreName: string,
    verificationChecks: boolean,
    collectorTime: number,
    maximumNumberOfUsers: number,
    lockedRanks: (string | number)[],
    lockedCommands: string[],
}