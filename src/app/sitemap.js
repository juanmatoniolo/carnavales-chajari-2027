// src/app/sitemap.js
export default function sitemap() {
	const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
	const now = new Date();

	const rutas = [
		{ url: `${base}/`, priority: 1.0, changeFrequency: "monthly" },
		{
			url: `${base}/inscripcion/fenix`,
			priority: 0.9,
			changeFrequency: "monthly",
		},
		{
			url: `${base}/inscripcion/sisiri`,
			priority: 0.9,
			changeFrequency: "monthly",
		},
		{
			url: `${base}/inscripcion/alumine`,
			priority: 0.9,
			changeFrequency: "monthly",
		},
		{
			url: `${base}/inscripcion/amaru`,
			priority: 0.9,
			changeFrequency: "monthly",
		},
	];

	return rutas.map((r) => ({
		url: r.url,
		lastModified: now,
		changeFrequency: r.changeFrequency,
		priority: r.priority,
	}));
}
