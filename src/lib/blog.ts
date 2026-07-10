export function getCategoryInfo(tags: string[] | undefined) {
	const tag = (tags?.[0] || '').toLowerCase();
	const groups = [
		{ keywords: ['fitness', 'exercise', 'workout', 'activity'], light: 'oklch(62% 0.15 248)', dark: 'oklch(68% 0.13 248)', motif: 'line' },
		{ keywords: ['guide', 'habit', 'tracking', 'weight'], light: 'oklch(70% 0.13 74)', dark: 'oklch(76% 0.12 74)', motif: 'bars' },
		{ keywords: ['science', 'research', 'bmi', 'body'], light: 'oklch(58% 0.16 300)', dark: 'oklch(66% 0.14 300)', motif: 'ring' },
		{ keywords: ['nutrition', 'diet', 'hydration', 'wellness', 'water', 'food'], light: 'oklch(64% 0.13 165)', dark: 'oklch(70% 0.12 165)', motif: 'arc' },
	];
	for (const g of groups) {
		if (g.keywords.some(k => tag.includes(k))) return g;
	}
	return { light: 'oklch(65% 0.15 185)', dark: 'oklch(72% 0.13 185)', motif: 'line' };
}

export function getMotifContent(motif: string) {
	const v = 'vector-effect="non-scaling-stroke"';
	switch (motif) {
		case 'arc':
			return `<path d="M0,145 Q55,120 100,75 Q150,25 200,15" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" ${v}/><path d="M0,145 Q55,120 100,75 Q150,25 200,15 L200,150 L0,150 Z" fill="currentColor" opacity="0.12" ${v}/><circle cx="100" cy="75" r="3" fill="currentColor" ${v}/><circle cx="200" cy="15" r="3" fill="currentColor" ${v}/>`;
		case 'line':
			return `<polyline points="0,115 28,115 28,60 60,60 60,85 92,85 92,35 124,35 124,72 156,72 156,48 200,48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" ${v}/><polygon points="0,150 0,115 28,115 28,60 60,60 60,85 92,85 92,35 124,35 124,72 156,72 156,48 200,48 200,150" fill="currentColor" opacity="0.1" ${v}/>`;
		case 'ring':
			return `<circle cx="100" cy="75" r="58" fill="none" stroke="currentColor" stroke-width="2.5" opacity="0.8" ${v}/><circle cx="100" cy="75" r="38" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5" ${v}/><circle cx="100" cy="75" r="18" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3" ${v}/><circle cx="100" cy="75" r="4" fill="currentColor" ${v}/><line x1="100" y1="17" x2="100" y2="133" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 6" opacity="0.35" ${v}/><line x1="42" y1="75" x2="158" y2="75" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 6" opacity="0.35" ${v}/>`;
		case 'bars':
			return `<rect x="22" y="70" width="22" height="55" rx="4" fill="currentColor" opacity="0.55" ${v}/><rect x="52" y="40" width="22" height="85" rx="4" fill="currentColor" opacity="0.75" ${v}/><rect x="82" y="20" width="22" height="105" rx="4" fill="currentColor" ${v}/><rect x="112" y="50" width="22" height="75" rx="4" fill="currentColor" opacity="0.65" ${v}/><rect x="142" y="10" width="22" height="115" rx="4" fill="currentColor" ${v}/><rect x="172" y="35" width="22" height="90" rx="4" fill="currentColor" opacity="0.45" ${v}/>`;
		default:
			return `<polyline points="0,115 28,115 28,60 60,60 60,85 92,85 92,35 124,35 124,72 156,72 156,48 200,48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" ${v}/><polygon points="0,150 0,115 28,115 28,60 60,60 60,85 92,85 92,35 124,35 124,72 156,72 156,48 200,48 200,150" fill="currentColor" opacity="0.1" ${v}/>`;
	}
}
