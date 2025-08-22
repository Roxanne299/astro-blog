// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';
import markdocGrammar from './grammars/markdoc.tmLanguage.json';

export const locales = {
	root: { label: '中文', lang: 'zh-CN' },
};

/* https://docs.netlify.com/configure-builds/environment-variables/#read-only-variables */
const NETLIFY_PREVIEW_SITE = process.env.CONTEXT !== 'production' && process.env.DEPLOY_PRIME_URL;

const site = NETLIFY_PREVIEW_SITE || 'https://blog.waaar.cn/';
const ogUrl = new URL('og.jpg?v=1', site).href;
const ogImageAlt = 'waaar个人博客';

export default defineConfig({
	site,
	trailingSlash: 'always',
	integrations: [
		starlight({
			title: 'WAAAR Blog',
			logo: {
				light: '/src/assets/logo-light.svg',
				dark: '/src/assets/logo-dark.svg',
				replacesTitle: true,
			},
			lastUpdated: true,
			editLink: {
				baseUrl: 'https://github.com/Roxanne299/astro-blog/edit/starlight/docs/',
			},
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/Roxanne299/' },
			],
			head: [
				{
					tag: 'script',
					attrs: {
						src: 'https://cdn.usefathom.com/script.js',
						'data-site': 'EZBHTSIG',
						defer: true,
					},
				},
				{
					tag: 'meta',
					attrs: { property: 'og:image', content: ogUrl },
				},
				{
					tag: 'meta',
					attrs: { property: 'og:image:alt', content: ogImageAlt },
				},
			],
			customCss: ['./src/assets/landing.css'],
			locales,
			sidebar: [
				{
					label: 'Technical',
					items: [
						{
							label: 'Java',
							autogenerate: { directory: 'technical/java' },
						},
						{
							label: 'Database',
							autogenerate: { directory: 'technical/database' },
						},
						{
							label: 'Tools',
							autogenerate: { directory: 'technical/tools' },
						},
						{
							label: 'AI',
							autogenerate: { directory: 'technical/ai' },
						},
						{
							label: 'Architecture',
							autogenerate: { directory: 'technical/architecture' },
						},
						{
							label: 'DevOps',
							autogenerate: { directory: 'technical/devops' },
						},
						{
							label: 'Concurrency',
							autogenerate: { directory: 'technical/concurrency' },
						},
					],
				},
				{
					label: 'Algorithm',
					items: [
						{
							label: 'Contest',
							autogenerate: { directory: 'algorithm/contest' },
						},
						{
							label: 'Advanced',
							autogenerate: { directory: 'algorithm/advanced' },
						},
					],
				},
				{
					label: 'Investment',
					items: [
						{
							label: 'Basics',
							autogenerate: { directory: 'investment/basics' },
						},
					],
				},
			],
			expressiveCode: { shiki: { langs: [markdocGrammar] } },
			plugins: process.env.CHECK_LINKS
				? [
						starlightLinksValidator({
							errorOnFallbackPages: false,
							errorOnInconsistentLocale: true,
						}),
					]
				: [],
		}),
	],
});
