export function getFingerprint(): string {
  if (typeof window === "undefined") return "";
  let fp = localStorage.getItem("sc_fingerprint");
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem("sc_fingerprint", fp);
  }
  return fp;
}
