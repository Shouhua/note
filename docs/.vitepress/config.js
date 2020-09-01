module.exports = {
  title: 'Notes',
  description: 'Notes',
  base: '/',
  head: [],
  search: true,
  themeConfig: {
    nav: [
      { text: 'Vue Next', link: '/vue-next/' },
      { text: 'Guide', link: '/guide/' },
    ],
    sidebar: {
      '/vue-next/': [
        { text: '大纲', link: '/vue-next/' },
        { text: 'compiler', link: '/vue-next/compiler'},
        { text: 'Getting Started', link: '/vue-next/runtime' },
      ],
      '/guide/': [
        { text: '基础', link: '/guide/', children: [
          { text: 'Debounce & Throttle', link: '/guide/debounce-throttle' },
          { text: 'Defer & Async', link: '/guide/defer-async' },
          { text: 'Event target', link: '/guide/event-target' },
          { text: 'Jsonp', link: '/guide/jsonp' },
          { text: 'Regex', link: '/guide/regex' },
        ]},
      ],
    }
  },
  markdown: {
    anchor: { // 没有生效
      permalink: false,
      permalinkBefore: false,
      permalinkSymbol: '###'
    }
  }
}