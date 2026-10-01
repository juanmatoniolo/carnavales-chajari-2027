// src/lib/comparsas.js

export const COMPARSAS = {
	fenix: {
		nombre: "Fénix",
		club: "Ferro",
		color: "#1c6a1f",
		logo: "/Ferro.webp", // 🖼️ UI (header, cards)
		og: "/Ferro.png", // 📱 Preview WhatsApp / FB
	},
	sisiri: {
		nombre: "Sirirí",
		club: "Vélez",
		color: "#03a9f4",
		logo: "/Velez.webp",
		og: "/Velez.png",
	},
	alumine: {
		nombre: "Aluminé",
		club: "Primero de Mayo",
		color: "#9c27b0",
		logo: "/Primero.webp",
		og: "/Primero.png",
	},
	amaru: {
		nombre: "Amarú",
		club: "San Clemente",
		color: "#d9cc3a",
		logo: "/Sanclemente.png",
		og: "/Sanclemente.png",
	},
};

export const COMPARSA_IDS = Object.keys(COMPARSAS);

export function getComparsa(id) {
	return COMPARSAS[id] || null;
}
