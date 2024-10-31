//Import template custom elements
import { defineCustomElement } from 'vue'
import type { App } from 'vue'
import { createPinia } from "pinia";
import StatusButton from "./components/StatusButton.vue";
//Import CWNP elements
import * as PluginKit from '@ciderapp/pluginkit';
import { definePluginContext } from '@ciderapp/pluginkit'
import PluginConfig from './plugin.config';
import { useCiderAudio } from '@ciderapp/pluginkit';
import { addImmersiveLayout, addMainMenuEntry, createModal, addImmersiveMenuEntry, addCustomButton, addMediaItemContextMenuEntry } from '@ciderapp/pluginkit';

const pinia = createPinia();

function configureApp(app: App) {
    app.use(pinia);
}

export const CustomElements = {
    'status-button': defineCustomElement(StatusButton, {
    shadowRoot: false,
    configureApp
  }),
};





const { plugin, setupConfig, customElementName, goToPage, useCPlugin } = definePluginContext({
    ...PluginConfig,
    CustomElements,
    setup() {
        let socket: WebSocket | null = null;
        let reconnectAttempts = 0;
        const MAX_RECONNECT_ATTEMPTS = 5;
        const RECONNECT_DELAY = 5000;
        const musicKit = PluginKit.useMusicKit();
        const cider = PluginKit.useCider();

        for (const [key, value] of Object.entries(CustomElements)) {
            const _key = key as keyof typeof CustomElements;
            customElements.define(customElementName(_key), value)
        }

        this.SettingsElement = customElementName('settings');


        const initWebSocket = () => {
            try {
                socket = new WebSocket('ws://localhost:8974');
                
                socket.onopen = () => {
                    console.log('WebNowPlaying: WebSocket connected');
                    updateConnectionStatus(true);
                    reconnectAttempts = 0; // Reset reconnect attempts on successful connection
                    emitPlaybackInfo(); // Send initial playback info
                };

                socket.onerror = (error: Event) => {
                    console.error('WebNowPlaying: WebSocket error:', error);
                    updateConnectionStatus(false);
                };

                socket.onclose = () => {
                    console.warn('WebNowPlaying: WebSocket closed');
                    updateConnectionStatus(false);
                    handleReconnection();
                };

                socket.onmessage = (event: MessageEvent) => {
                    handleWebNowPlayingCommand(event.data.toString());
                };
            } catch (error) {
                console.error(`WebNowPlaying: Failed to create WebSocket: ${error}`);

                updateConnectionStatus(false);
                handleReconnection();
            }
        };

        const handleReconnection = () => {
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                const delay = RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts);
                reconnectAttempts++;
                setTimeout(initWebSocket, delay);
            } else {
                console.error('WebNowPlaying: Max reconnection attempts reached');
            }
        };


        function updateConnectionStatus(isConnected: boolean) {
            const statusButtonElement = document.querySelector('status-button');
            if (statusButtonElement) {
              // @ts-ignore - Accessing internal method of custom element
              statusButtonElement.updateConnectionStatus(isConnected);
            }
          }

          const emitPlaybackInfo = () => {
            if (!socket || socket.readyState !== WebSocket.OPEN) {
                console.warn('WebNowPlaying: Cannot emit playback info: WebSocket not connected');
                return;
            }
        
            const nowPlayingItem = musicKit.player?.nowPlayingItem;
            if (!nowPlayingItem) {
                console.debug('WebNowPlaying: No track currently playing');
                return;
            }
        
            try {
                const info = [
                    `PLAYER:Cider`,
                    `STATE:${musicKit.player.isPlaying ? 1 : 2}`,
                    `TITLE:${nowPlayingItem.title || 'Unknown Title'}`,
                    `ARTIST:${nowPlayingItem.artistName || 'Unknown Artist'}`,
                    `ALBUM:${nowPlayingItem.albumName || 'Unknown Album'}`,
                    `COVER:${nowPlayingItem.artwork?.url?.replace('{w}', '500').replace('{h}', '500') || ''}`,
                    `DURATION:${(nowPlayingItem.playbackDuration || 0) * 1000}`, // Convert to milliseconds
                    `POSITION:${(musicKit.player.currentPlaybackTime || 0) * 1000}`, // Convert to milliseconds
                    `VOLUME:${Math.round(cider.audio.volume * 100)}`,
                    `RATING:${nowPlayingItem.rating || 0}`,
                    `REPEAT:${musicKit.player.repeatMode}`,
                    `SHUFFLE:${musicKit.player.shuffleMode ? 1 : 0}`
                ].join('\n');
        
                socket.send(info);
            } catch (error) {
                console.error(`WebNowPlaying: Failed to send playback info: ${error}`);
            }
        };

            const handleWebNowPlayingCommand = (rawCommand: string) => {
                const commandParts = rawCommand.trim().split(' ');
                const command = commandParts[0].toUpperCase();
                const value = commandParts[1];
    
                try {
                    switch (command) {
                        case 'PLAYPAUSE':
                            cider.playbackService.playPause();
                            break;
                        case 'PLAY':
                            cider.playbackService.play();
                            break;
                        case 'PAUSE':
                            cider.playbackService.pause();
                            break;
                        case 'NEXT':
                            cider.playbackService.next();
                            break;
                        case 'PREVIOUS':
                            cider.playbackService.previous();
                            break;
                        case 'STOP':
                            cider.playbackService.stop();
                            break;
                        case 'REPEAT':
                            cider.playbackService.toggleRepeat();
                            break;
                        case 'SHUFFLE':
                            cider.playbackService.toggleShuffle();
                            break;
                        case 'SETPOSITION':
                            if (value) {
                                const position = parseFloat(value);
                                if (!isNaN(position)) {
                                    cider.playbackService.seekTo(position / 1000); // Convert to seconds
                                }
                            }
                            break;
                        case 'SETVOLUME':
                            if (value) {
                                const volume = Math.min(Math.max(parseFloat(value), 0), 100);
                                if (!isNaN(volume)) {
                                    cider.audio.volume = volume / 100;
                                }
                            }
                            break;
                    }

            
            
                // Update playback info after command execution
                setTimeout(emitPlaybackInfo, 100);
            } catch (error) {
                console.error(`WebNowPlaying: Error handling command ${command}:`, error);
            }
        };

        // Initialize WebSocket connection
        initWebSocket();

        // Register playback listeners
        PluginKit.useMessageListener('playbackStateDidChange', emitPlaybackInfo);
        PluginKit.useMessageListener('nowPlayingItemDidChange', emitPlaybackInfo);
        PluginKit.useMessageListener('playbackTimeDidChange', emitPlaybackInfo);
        PluginKit.useMessageListener('volumeDidChange', emitPlaybackInfo);

        PluginKit.useMessageListener('unload', () => {
            if (socket?.readyState === WebSocket.OPEN) {
                socket.close();
                socket = null;
            }
        });

        addMainMenuEntry({
            label: "Show Connection Modal",
            onClick() {
                const { closeDialog, openDialog, dialogElement } = createModal({
                    escClose: true,
                });
                const content = document.createElement(customElementName('status-button'));
                // @ts-ignore
                content._props.closeFn = closeDialog;
                dialogElement.appendChild(content);
                openDialog();
            },
        });

        const audio = useCiderAudio();
        audio.subscribe('ready', () => {
            console.log("CiderAudio is ready!", audio.context);
        });

        addMediaItemContextMenuEntry({
            label: 'Send to plugin',
            onClick(item) {
                console.log('Got this item', item);
            },
        });
        
    }
});
        
export default plugin;