/**
 * Központi jogi/cégadatok — itt cseréld le valós adatokra,
 * minden jogi dokumentum innen olvas.
 */
export const LEGAL_INFO = {
  // Szolgáltató
  brandName: "Egyszerű de Nagyszerű",
  ownerName: "Horváth Zoltán",
  legalForm: "magánszemély / induló egyéni vállalkozó",
  taxId: "[ADÓSZÁM PÓTLANDÓ]",
  registryNumber: "[NYILVÁNTARTÁSI SZÁM PÓTLANDÓ]",
  registeredOffice: "[SZÉKHELY CÍM PÓTLANDÓ]",
  mailingAddress: "[POSTACÍM PÓTLANDÓ]",
  country: "Magyarország",

  // Elérhetőségek
  email: "info@egyszerudenagyszeru.com",
  legalEmail: "jog@egyszerudenagyszeru.com",
  privacyEmail: "adatvedelem@egyszerudenagyszeru.com",
  phone: "[TELEFON PÓTLANDÓ]",
  customerHours: "Munkanapokon 9:00–17:00",

  // Web
  website: "https://egyszerudenagyszeru.com",
  domain: "egyszerudenagyszeru.com",

  // Tárhely
  hostingProvider: "Lovable Cloud (Supabase Inc.)",
  hostingAddress: "970 Toa Payoh North #07-04, Singapore 318992",
  hostingEmail: "support@supabase.io",

  // Hatóságok
  consumerAuthority: "Budapest Főváros Kormányhivatala — Fogyasztóvédelmi Főosztály",
  consumerAuthorityAddress: "1051 Budapest, Sas utca 19. III. em.",
  dataAuthority: "Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH)",
  dataAuthorityAddress: "1055 Budapest, Falk Miksa utca 9-11.",
  dataAuthorityEmail: "ugyfelszolgalat@naih.hu",
  dataAuthorityPhone: "+36 (1) 391-1400",
  arbitrationBoard: "Budapesti Békéltető Testület",
  arbitrationAddress: "1016 Budapest, Krisztina krt. 99. III. em. 310.",
  arbitrationEmail: "bekelteto.testulet@bkik.hu",

  // Pénzügy
  currency: "HUF (forint)",
  vatStatus: "ÁFA-mentes (alanyi adómentes) / vagy 27% ÁFA — pótlandó",
  bankName: "[BANK NEVE]",
  bankAccount: "[BANKSZÁMLASZÁM]",

  // Jogi
  governingLaw: "Magyarország joga",
  jurisdiction: "magyar bíróságok, általános hatáskörrel és illetékességgel",

  // Verzió
  version: "1.0",
  effectiveDate: "2026.01.01.",
  lastUpdated: "2026.04.24.",
} satisfies Record<string, string>;
