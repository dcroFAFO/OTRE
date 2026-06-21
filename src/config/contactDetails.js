export const CONTACT_DETAILS = {
  businessName: "On The Run Electrics",
  email: "hello@ontherunelectrics.com.au",
  phone: "0415 505 908",
  tel: "+61415505908",
  address: "11 Lucinda Street, Wooloongabba QLD 4102",
  openingHours: "Monday – Sunday: 11:00 AM – 7:30 PM",
};

export const CONTACT_LINKS = {
  email: `mailto:${CONTACT_DETAILS.email}`,
  phone: `tel:${CONTACT_DETAILS.tel}`,
  maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONTACT_DETAILS.address)}`,
};