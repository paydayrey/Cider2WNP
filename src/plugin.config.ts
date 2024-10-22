import { createId } from "@paralleldrive/cuid2"

export default {
    ce_prefix: createId(),
    identifier: 'org.webnowplaying.cider-integration',
    name: 'Cider2WNP',
    description: 'Integrates WebNowPlaying with Cider 2, enabling enhanced Rainmeter support for music information.',
    version: '1.0.0',
    author: 'PayDayRey',
    repo: 'https://github.com/paydayrey/Cider2WNP',
    entry: {
        'plugin.js': {
            type: 'main',
        }
    }
}
