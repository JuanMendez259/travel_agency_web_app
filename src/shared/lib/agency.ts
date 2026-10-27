export const AGENCY = {
  name: "Proxima Parada Tours",
  whatsapp: "5214444579256",
  phone: "444 457 9256",
  email: "hola@rutaverde.travel",
  instagram: "https://www.instagram.com/proxima_parada_tours/",
  timezone: "America/Mexico_City",
};

export function agencyWhatsAppHref(message: string): string {
  return `https://wa.me/${AGENCY.whatsapp}?text=${encodeURIComponent(message)}`;
}
