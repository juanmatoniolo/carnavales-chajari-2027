// src/lib/dates.js

export function formatYMD(ymd) {
	if (!ymd || typeof ymd !== "string") return "-";
	const [y, m, d] = ymd.split("-");
	if (!y || !m || !d || y.length !== 4) return "-";
	return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
}

export function calcEdad(ymd) {
	if (!ymd || typeof ymd !== "string") return null;
	const [y, m, d] = ymd.split("-").map(Number);
	if (!y || !m || !d) return null;
	const today = new Date();
	let age = today.getFullYear() - y;
	const mdNow = (today.getMonth() + 1) * 100 + today.getDate();
	const mdBirth = m * 100 + d;
	if (mdNow < mdBirth) age--;
	return age >= 0 ? age : null;
}

export function formatEpoch(epoch) {
	if (!epoch) return "-";
	const dt = new Date(epoch);
	if (isNaN(dt.getTime())) return "-";
	const dd = String(dt.getDate()).padStart(2, "0");
	const mm = String(dt.getMonth() + 1).padStart(2, "0");
	const yy = dt.getFullYear();
	const hh = String(dt.getHours()).padStart(2, "0");
	const mi = String(dt.getMinutes()).padStart(2, "0");
	return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}

export function todayYMD() {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
