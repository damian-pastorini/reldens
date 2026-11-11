/**
 *
 * Reldens - Chat Steps
 *
 * The steps of the chat specs: the group players logged in (the first two on the spec pages and the third one on its
 * own client page, also added to two players already logged in, with the chat of every page recorded), the chat
 * messages a client receives recorded from both rooms that send them (the scene room for the room messages and the
 * system lines, the global chat room for the global, private and error messages), each with the room it came from,
 * read whole or without the joined and left notices (the global chat room sends the left notice of every player, also
 * of the players of the other groups running at the same time), the chat opened and a text typed and sent like a player does (ENTER on the input), a raw chat message sent to the
 * scene room or to the global chat room like a modified client would, and the text a chat tab shows.
 *
 */

const { expect } = require('@playwright/test');
const { Login } = require('./login');
const { TimeConstants } = require('./time-constants');
const { Selectors } = require('../selectors');
const { ChatConst } = require('../../../lib/chat/constants');

class ChatSteps
{

    static SCENE_ROOM = 'scene';
    static CHAT_ROOM = 'chat';
    static PRESENCE_NOTICES = [ChatConst.SNIPPETS.JOINED_ROOM, ChatConst.SNIPPETS.LEFT_ROOM];

    static async enterPlayers(context, withThird = false)
    {
        await Login.loginRootPlayer(context.page, context.gameConfig, context.longRun);
        await Login.loginRootPlayer(context.secondPage, context.gameConfig, context.longRun, '2');
        return await ChatSteps.recordPlayersChat(context, withThird);
    }

    static async recordPlayersChat(context, withThird = false)
    {
        let pages = [context.page, context.secondPage];
        if(withThird){
            let thirdClient = await Login.openClientPage(context.page, context.gameConfig);
            await Login.loginRootPlayer(thirdClient.clientPage, context.gameConfig, context.longRun, '3');
            pages.push(thirdClient.clientPage);
        }
        for(let page of pages){
            await ChatSteps.recordChat(page);
        }
        return pages;
    }

    static async recordChat(page)
    {
        await page.evaluate((roomKeys) => {
            window.e2eChatMessages = [];
            let rooms = {
                [roomKeys.scene]: window.reldens.activeRoomEvents.room,
                [roomKeys.chat]: window.reldens.joinedRooms[roomKeys.globalKey]
            };
            window.e2eChatRooms = window.e2eChatRooms || [];
            for(let roomKey of Object.keys(rooms)){
                let room = rooms[roomKey];
                if(!room || window.e2eChatRooms.includes(room)){
                    continue;
                }
                window.e2eChatRooms.push(room);
                room.onMessage('*', (message) => {
                    if(message && roomKeys.chatAction === message.act){
                        window.e2eChatMessages.push(Object.assign({room: roomKey}, message));
                    }
                });
            }
        }, {scene: ChatSteps.SCENE_ROOM, chat: ChatSteps.CHAT_ROOM, globalKey: ChatConst.CHAT_GLOBAL, chatAction: ChatConst.CHAT_ACTION});
    }

    static async fetchChat(page)
    {
        return await page.evaluate(() => [...(window.e2eChatMessages || [])]);
    }

    static async fetchPlayersChat(page)
    {
        return (await ChatSteps.fetchChat(page)).filter(
            message => !ChatSteps.PRESENCE_NOTICES.includes(message[ChatConst.MESSAGE.KEY])
        );
    }

    static async fetchTexts(page, chatType = false)
    {
        return (await ChatSteps.fetchChat(page))
            .filter(message => false === chatType || chatType === message[ChatConst.TYPES.KEY])
            .map(message => String(message[ChatConst.MESSAGE.KEY]).trim());
    }

    static async openChat(page)
    {
        if(await page.locator(Selectors.chat.input).isVisible()){
            return;
        }
        await page.locator(Selectors.hud.chatOpen).waitFor({state: 'visible', timeout: TimeConstants.UI_OPEN});
        await page.click(Selectors.hud.chatOpen);
        await expect(page.locator(Selectors.chat.input), 'The chat input is shown').toBeVisible();
    }

    static async sendText(page, text)
    {
        await ChatSteps.openChat(page);
        await page.locator(Selectors.chat.input).fill(text);
        await page.locator(Selectors.chat.input).press('Enter');
    }

    static async sendRaw(page, message, toChatRoom = false)
    {
        await page.evaluate((sent) => {
            if(sent.toChatRoom){
                window.reldens.joinedRooms[sent.globalKey].send('*', sent.message);
                return;
            }
            window.reldens.activeRoomEvents.send(sent.message);
        }, {message: Object.assign({act: ChatConst.CHAT_ACTION}, message), toChatRoom, globalKey: ChatConst.CHAT_GLOBAL});
    }

    static async fetchTabText(page, tabId)
    {
        return await page.locator(Selectors.chat.tabContent(tabId)).innerText();
    }

}

module.exports.ChatSteps = ChatSteps;
