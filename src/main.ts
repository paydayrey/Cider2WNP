//Import template custom elements
import { defineCustomElement } from 'vue'
import type { App } from 'vue'
import { createPinia } from "pinia";
import HelloWorld from "./components/HelloWorld.vue";
import MySettings from "./components/MySettings.vue";
import ModalExample from "./components/ModalExample.vue";
import CustomImmersiveLayout from "./components/CustomImmersiveLayout.vue";
import CustomPage from "./pages/CustomPage.vue";
import StatusButton from "./components/StatusButton.vue";
//Import CWNP elements
import * as PluginKit from '@ciderapp/pluginkit';
import { definePluginContext } from '@ciderapp/pluginkit'
import PluginConfig from './plugin.config';
// import * as WebSocket from 'ws';
import { useCiderAudio } from '@ciderapp/pluginkit';
import { addImmersiveLayout, addMainMenuEntry, createModal, addImmersiveMenuEntry, addCustomButton, addMediaItemContextMenuEntry } from '@ciderapp/pluginkit';

const pinia = createPinia();

function configureApp(app: App) {
    app.use(pinia);
}

export const CustomElements = {
    'hello-world': defineCustomElement(HelloWorld, {
        shadowRoot: false,
        configureApp
    }),
    'settings': defineCustomElement(MySettings, {
        shadowRoot: false,
        configureApp
    }),
    'modal-example': defineCustomElement(ModalExample, {
        shadowRoot: false,
        configureApp
    }),
    'page-helloworld': defineCustomElement(CustomPage, {
        shadowRoot: false,
        configureApp
    }),
    'immersive-layout': defineCustomElement(CustomImmersiveLayout, {
        shadowRoot: false,
        configureApp
    }),
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
                socket.onopen = () => { console.log('WebNowPlaying: WebSocket connected');
                updateConnectionStatus(true);
    };
                socket.onerror = (error: Event) => { console.error('WebNowPlaying: WebSocket error:', error);
                    updateConnectionStatus(false);
    };
                socket.onclose = () => {
                    console.warn('WebNowPlaying: WebSocket closed');
                    updateConnectionStatus(false);
                    setTimeout(initWebSocket, 5000);
                };
                socket.onmessage = (event: MessageEvent) => {
                    const command = event.data.toString();
                    handleWebNowPlayingCommand(command);
                };
            } catch (error) {
                console.error(`WebNowPlaying: Failed to create WebSocket: ${error}`);
                updateConnectionStatus(false);
                setTimeout(initWebSocket, 5000);
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

            const nowPlayingItem = musicKit.player.nowPlayingItem;
            const playbackState = musicKit.player.playbackState;

            PluginKit.useMessageListener('unload', () => {
                if (socket) {
                    socket.close();
                }
            });
            
            const info = {
                player: 'Cider',
                state: playbackState === 2 ? 1 : 2, // 1 for playing, 2 for paused
                title: nowPlayingItem?.title || 'Unknown Title',
                artist: nowPlayingItem?.artistName || 'Unknown Artist',
                album: nowPlayingItem?.albumName || 'Unknown Album',
                cover: nowPlayingItem?.artwork?.url || '',
                duration: nowPlayingItem?.playbackDuration || 0,
                position: musicKit.player.currentPlaybackTime || 0,
                rating: nowPlayingItem?.rating || 0,
                repeat: musicKit.player.repeatMode,
                shuffle: musicKit.player.shuffleMode ? 1 : 0
            };

            try {
                socket.send(JSON.stringify(info));
            } catch (error) {
                console.error(`WebNowPlaying: Failed to send playback info: ${error}`);
                    setTimeout(initWebSocket, 5000);
            }

        };
const handleWebNowPlayingCommand = (command: string) => {
                switch (command) {
                    case 'Play':
                        cider.playbackService.play();
                        break;
                    case 'Pause':
                        cider.playbackService.pause();
                        break;
                    case 'PlayPause':
                        cider.playbackService.playPause();
                        break;
                    case 'Next':
                        cider.playbackService.next();
                        break;
                    case 'Previous':
                        cider.playbackService.previous();
                        break;
                    case 'Stop':
                        cider.playbackService.stop();
                        break;
                    case 'Repeat':
                        cider.playbackService.toggleRepeat();
                        break;
                    case 'Shuffle':
                        cider.playbackService.toggleShuffle();
                        break;
                    default:
                        if (command.startsWith('SetPosition ')) {
                            const position = parseFloat(command.split(' ')[1]);
                            if (!isNaN(position)) {
                                cider.playbackService.seekTo(position);
                            }
                        } else if (command.startsWith('SetVolume ')) {
                            const volume = parseFloat(command.split(' ')[1]);
                            if (!isNaN(volume)) {
                                cider.audio.volume = volume / 100;
                            }
                        }
                }
                // After executing any command, update the playback info
                emitPlaybackInfo();
            };

            
                // Initialize WebSocket connection
                initWebSocket();
                // Register playback listeners
        PluginKit.useMessageListener('playbackStateDidChange', emitPlaybackInfo);
        PluginKit.useMessageListener('nowPlayingItemDidChange', emitPlaybackInfo);


        
        addImmersiveLayout({
            name: "My layout",
            identifier: "my-layout",
            component: customElementName('immersive-layout'),
            type: 'normal',
        });

        addMainMenuEntry({
            label: "Go to my page",
            onClick() {
                goToPage({
                    name: 'page-helloworld'
                });
            },
        });

        addMainMenuEntry({
            label: "Modal example",
            onClick() {
                const { closeDialog, openDialog, dialogElement } = createModal({
                    escClose: true,
                });
                const content = document.createElement(customElementName('modal-example'));
                // @ts-ignore
                content._props.closeFn = closeDialog;
                dialogElement.appendChild(content);
                openDialog();
            },
        });

        addMainMenuEntry({
            label: "Connection Status",
            onClick() {
                goToPage({
                    name: 'page-helloworld'
                });
            },
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

        addImmersiveMenuEntry({
            label: "Go to my page",
            onClick() {
                goToPage({
                    name: 'page-helloworld'
                });
            },
        });

        addCustomButton({
            element: '♥',
            location: 'chrome-top/right',
            title: 'Click me!',
            menuElement: customElementName('hello-world'),
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
        
    

export const cfg = setupConfig({
    favoriteColor: <'red' | 'green' | 'blue'>'blue',
    count: <number>0,
    booleanOption: <boolean>false,
});
        
export function useConfig() {
    return cfg.value;
}
export { setupConfig, customElementName, goToPage, useCPlugin };
export default plugin;






        
