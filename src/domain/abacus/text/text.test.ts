import { describe, expect, it } from 'vitest';
import { email as validateEmail } from '../validate';
import {
  company,
  email,
  endsWithHardConsonant,
  endsWithVowel,
  isBackVowel,
  isRoundedVowel,
  join,
  lastVowel,
  lower,
  name,
  numberToWords,
  phone,
  suffix,
  title,
  toTrLower,
  upper,
  website,
  websiteUrl,
  whatsapp,
} from './index';

describe('ABACUS text.numberToWords motoru', () => {
  it('0 için Sıfır döner', () => {
    expect(numberToWords(0)).toBe('Sıfır');
  });

  it('1-9 tek basamaklı sayıları çevirir', () => {
    expect(numberToWords(1)).toBe('Bir');
    expect(numberToWords(5)).toBe('Beş');
  });

  it('10-99 iki basamaklı sayıları çevirir', () => {
    expect(numberToWords(11)).toBe('OnBir');
    expect(numberToWords(20)).toBe('Yirmi');
    expect(numberToWords(54)).toBe('ElliDört');
  });

  it('yüz kuralını "bir" düşürme ile uygular (100 -> Yüz, 200 -> İkiYüz)', () => {
    expect(numberToWords(100)).toBe('Yüz');
    expect(numberToWords(300)).toBe('ÜçYüz');
    expect(numberToWords(345)).toBe('ÜçYüzKırkBeş');
  });

  it('bin kuralını "bir" düşürme ile uygular (1000 -> Bin, 2000 -> İkiBin)', () => {
    expect(numberToWords(1000)).toBe('Bin');
    expect(numberToWords(2000)).toBe('İkiBin');
    expect(numberToWords(320000)).toBe('ÜçYüzYirmiBin');
  });

  it('milyon kuralında "bir" düşmez (1000000 -> BirMilyon)', () => {
    expect(numberToWords(1000000)).toBe('BirMilyon');
    expect(numberToWords(3345334)).toBe('ÜçMilyonÜçYüzKırkBeşBinÜçYüzOtuzDört');
  });

  it('boşluklu (spaced) seçeneğini doğru uygular', () => {
    expect(numberToWords(3345334, { spaced: true })).toBe('Üç Milyon Üç Yüz Kırk Beş Bin Üç Yüz Otuz Dört');
  });

  describe('kenar durumları (edge cases)', () => {
    it('101 -> YüzBir', () => {
      expect(numberToWords(101)).toBe('YüzBir');
    });

    it('1001 -> BinBir', () => {
      expect(numberToWords(1001)).toBe('BinBir');
    });

    it('1000001 -> BirMilyonBir', () => {
      expect(numberToWords(1000001)).toBe('BirMilyonBir');
    });

    it('1001000 -> BirMilyonBin', () => {
      expect(numberToWords(1001000)).toBe('BirMilyonBin');
    });

    it('100100 -> YüzBinYüz', () => {
      expect(numberToWords(100100)).toBe('YüzBinYüz');
    });

    it('2001 -> İkiBinBir', () => {
      expect(numberToWords(2001)).toBe('İkiBinBir');
    });

    it('11000 -> OnBirBin', () => {
      expect(numberToWords(11000)).toBe('OnBirBin');
    });

    it('1100000 -> BirMilyonYüzBin', () => {
      expect(numberToWords(1100000)).toBe('BirMilyonYüzBin');
    });
  });
});

describe('ABACUS text ek-fonetiği temel yardımcıları', () => {
  describe('toTrLower (Türkçe harf küçültme)', () => {
    it('tam kelimeleri Türkçe kurallarına göre doğru küçültür', () => {
      expect(toTrLower('İSTANBUL')).toBe('istanbul');
      expect(toTrLower('IŞIK')).toBe('ışık');
      expect(toTrLower('ÇAĞLAYAN')).toBe('çağlayan');
      expect(toTrLower('GÜNÜMÜZ')).toBe('günümüz');
      expect(toTrLower('ABC')).toBe('abc');
      expect(toTrLower('İğne')).toBe('iğne');
    });
  });

  describe('lastVowel', () => {
    it('kelimedeki son ünlüyü döner', () => {
      expect(lastVowel('kırk')).toBe('ı');
      expect(lastVowel('üç')).toBe('ü');
      expect(lastVowel('altı')).toBe('ı');
      expect(lastVowel('yedi')).toBe('i');
      expect(lastVowel('bin')).toBe('i');
    });

    it('ücretsiz/ünlüsüz kelimede null döner', () => {
      expect(lastVowel('krk')).toBeNull();
    });
  });

  describe('isBackVowel', () => {
    it('kalın ünlü kontrolü yapar (a, ı, o, u)', () => {
      expect(isBackVowel('a')).toBe(true);
      expect(isBackVowel('ı')).toBe(true);
      expect(isBackVowel('e')).toBe(false);
      expect(isBackVowel('ü')).toBe(false);
    });
  });

  describe('isRoundedVowel', () => {
    it('yuvarlak ünlü kontrolü yapar (o, ö, u, ü)', () => {
      expect(isRoundedVowel('u')).toBe(true);
      expect(isRoundedVowel('ö')).toBe(true);
      expect(isRoundedVowel('ı')).toBe(false);
      expect(isRoundedVowel('a')).toBe(false);
    });
  });

  describe('endsWithHardConsonant', () => {
    it('fıstıkçı şahap sert ünsüz kontrolünü doğru yapar', () => {
      expect(endsWithHardConsonant('kırk')).toBe(true);
      expect(endsWithHardConsonant('beş')).toBe(true);
      expect(endsWithHardConsonant('bin')).toBe(false);
      expect(endsWithHardConsonant('altı')).toBe(false);
    });
  });

  describe('endsWithVowel', () => {
    it('son harfin ünlü olup olmadığını kontrol eder', () => {
      expect(endsWithVowel('altı')).toBe(true);
      expect(endsWithVowel('kırk')).toBe(false);
    });
  });
});

describe('ABACUS text.lower, upper, title Türkçe harf motoru', () => {
  describe('lower', () => {
    it('İSTANBUL ve IŞIK için Türkçe küçük harfe çevirir', () => {
      expect(lower('İSTANBUL')).toBe('istanbul');
      expect(lower('IŞIK')).toBe('ışık');
    });
  });

  describe('upper', () => {
    it('Türkçe i->İ, ı->I ve özel harf duyarlı büyük harfe çevirir', () => {
      expect(upper('iğne')).toBe('İĞNE');
      expect(upper('ışık')).toBe('IŞIK');
      expect(upper('çağlayan')).toBe('ÇAĞLAYAN');
      expect(upper('abc')).toBe('ABC');
    });
  });

  describe('title', () => {
    it('kelimelerin ilk harflerini büyük, kalanlarını küçük yapar (istisnalar ile)', () => {
      expect(title('ahmet yılmaz')).toBe('Ahmet Yılmaz');
      expect(title('AHMET YILMAZ')).toBe('Ahmet Yılmaz');
      expect(title('iSTANBUL')).toBe('İstanbul');
      expect(title('ışık deniz')).toBe('Işık Deniz');
      expect(title('abc san ve tic')).toBe('Abc San ve Tic');
      expect(title('ve abc')).toBe('Ve Abc');
      expect(title('tyc grup')).toBe('TYC Grup');
      expect(title('çelik metal')).toBe('Çelik Metal');
    });
  });
});

describe('ABACUS text.join ve normalize (telefon/e-posta/web) motoru', () => {
  describe('join (liste bağlama)', () => {
    it('eleman listesini Türkçe kurallarına göre bağlar', () => {
      expect(join([])).toBe('');
      expect(join(['Ali'])).toBe('Ali');
      expect(join(['Ali', 'Veli'])).toBe('Ali ve Veli');
      expect(join(['Ali', 'Veli', 'Can'])).toBe('Ali, Veli ve Can');
      expect(join(['Ali', '', 'Can'])).toBe('Ali ve Can');
    });
  });

  describe('phone (telefon normalizasyonu)', () => {
    it('Türkiye cep telefonlarını E.164 ve display biçimine çevirir', () => {
      const p1 = phone('05321234567');
      expect(p1.stored).toBe('+905321234567');
      expect(p1.display).toBe('+90 (532) 123 45 67');
      expect(p1.raw).toBe('05321234567');
      expect(p1.valid).toBe(true);

      const p2 = phone('5321234567');
      expect(p2.stored).toBe('+905321234567');
      expect(p2.display).toBe('+90 (532) 123 45 67');
      expect(p2.valid).toBe(true);

      const p3 = phone('+90 532 123 45 67');
      expect(p3.stored).toBe('+905321234567');
      expect(p3.display).toBe('+90 (532) 123 45 67');
      expect(p3.valid).toBe(true);

      const p4 = phone('90 532 123 4567');
      expect(p4.stored).toBe('+905321234567');
      expect(p4.display).toBe('+90 (532) 123 45 67');
      expect(p4.valid).toBe(true);

      const p5 = phone('123');
      expect(p5.stored).toBe('');
      expect(p5.display).toBe('');
      expect(p5.valid).toBe(false);
    });

    it('whatsapp direct linkini üretir', () => {
      expect(whatsapp('05321234567')).toBe('https://wa.me/905321234567');
      expect(whatsapp('123')).toBe('');
    });
  });

  describe('email (e-posta normalizasyonu)', () => {
    it('e-posta adreslerini temizler ve doğrular', () => {
      const e1 = email('  Info@X.CoM ');
      expect(e1.stored).toBe('info@x.com');
      expect(e1.display).toBe('info@x.com');
      expect(e1.valid).toBe(true);

      const e2 = email('abc');
      expect(e2.stored).toBe('');
      expect(e2.valid).toBe(false);
    });

    it('text.email ve validate.email arasında tam tutarlılık sağlar (DRY)', () => {
      const samples = [
        'a@b.com',
        'info@tradekasa.com',
        '  USER@DOMAIN.ORG  ',
        'abc',
        '@b.com',
        'a@b',
        '',
      ];
      for (const sample of samples) {
        expect(email(sample).valid).toBe(validateEmail(sample.trim()));
      }
    });
  });

  describe('website (web sitesi normalizasyonu)', () => {
    it('web adreslerini çıplak host haline getirir ve url üretir', () => {
      const w1 = website('https://www.example.com/');
      expect(w1.stored).toBe('example.com');
      expect(w1.display).toBe('example.com');
      expect(w1.valid).toBe(true);
      expect(websiteUrl('https://www.example.com/')).toBe('https://example.com');

      const w2 = website('www.Example.com');
      expect(w2.stored).toBe('example.com');
      expect(w2.valid).toBe(true);
      expect(websiteUrl('www.Example.com')).toBe('https://example.com');

      const w3 = website('example.com');
      expect(w3.stored).toBe('example.com');
      expect(w3.valid).toBe(true);
      expect(websiteUrl('example.com')).toBe('https://example.com');

      const w4 = website('');
      expect(w4.stored).toBe('');
      expect(w4.valid).toBe(false);
      expect(websiteUrl('')).toBe('');
    });
  });
});

describe('ABACUS text.name ve company normalizasyonu (motor kapanışı)', () => {
  describe('name (kişi adı normalizasyonu)', () => {
    it('kişi adını temizler, title casing uygular ve ham girdiyi saklar', () => {
      const n1 = name('ahmet yılmaz');
      expect(n1.stored).toBe('Ahmet Yılmaz');
      expect(n1.display).toBe('Ahmet Yılmaz');
      expect(n1.raw).toBe('ahmet yılmaz');
      expect(n1.valid).toBe(true);

      const n2 = name('  MEHMET   ali  ÖZ ');
      expect(n2.stored).toBe('Mehmet Ali Öz');
      expect(n2.display).toBe('Mehmet Ali Öz');
      expect(n2.valid).toBe(true);

      const n3 = name('ışık deniz');
      expect(n3.stored).toBe('Işık Deniz');
      expect(n3.valid).toBe(true);

      const n4 = name('ırmak yıldız');
      expect(n4.stored).toBe('Irmak Yıldız');
      expect(n4.valid).toBe(true);

      const n5 = name('');
      expect(n5.stored).toBe('');
      expect(n5.valid).toBe(false);
    });
  });

  describe('company (firma unvanı normalizasyonu)', () => {
    it('firma unvanlarındaki unvan kısaltmalarını standart formlarına dönüştürür', () => {
      const c1 = company('abc sanayi ve ticaret limited şirketi');
      expect(c1.stored).toBe('Abc San. ve Tic. Ltd.Şti.');
      expect(c1.display).toBe('Abc San. ve Tic. Ltd.Şti.');
      expect(c1.valid).toBe(true);

      const c2 = company('xyz inşaat anonim şirketi');
      expect(c2.stored).toBe('Xyz İnş. A.Ş.');
      expect(c2.valid).toBe(true);

      const c3 = company('deniz ithalat ihracat ltd şti');
      expect(c3.stored).toBe('Deniz İth. İhr. Ltd.Şti.');
      expect(c3.valid).toBe(true);

      const c4 = company('öz san. tic. a.ş.');
      expect(c4.stored).toBe('Öz San. Tic. A.Ş.');
      expect(c4.valid).toBe(true);

      const c5 = company('tyc grup pazarlama');
      expect(c5.stored).toBe('TYC Grup Paz.');
      expect(c5.valid).toBe(true);

      const c6 = company('');
      expect(c6.stored).toBe('');
      expect(c6.valid).toBe(false);
    });
  });
});

describe('ABACUS text.suffix ek çekimi motoru (loc, dat, abl, acc, gen)', () => {
  it('loc (bulunma) eklerini doğru üretir (-de/-da/-te/-ta)', () => {
    expect(suffix(2026, 'year', 'loc')).toBe("2026'da");
    expect(suffix(2025, 'year', 'loc')).toBe("2025'te");
    expect(suffix(40, 'number', 'loc')).toBe("40'ta");
    expect(suffix(3, 'number', 'loc')).toBe("3'te");
    expect(suffix(100, 'number', 'loc')).toBe("100'de");
    expect(suffix(1000, 'number', 'loc')).toBe("1000'de");
  });

  it('abl (çıkma) eklerini doğru üretir (-den/-dan/-ten/-tan)', () => {
    expect(suffix(2026, 'year', 'abl')).toBe("2026'dan");
    expect(suffix(40, 'number', 'abl')).toBe("40'tan");
    expect(suffix(2025, 'year', 'abl')).toBe("2025'ten");
  });

  it('dat (yönelme) eklerini doğru üretir (-e/-a/-ye/-ya)', () => {
    expect(suffix(2, 'number', 'dat')).toBe("2'ye");
    expect(suffix(40, 'number', 'dat')).toBe("40'a");
    expect(suffix(6, 'number', 'dat')).toBe("6'ya");
    expect(suffix(3, 'number', 'dat')).toBe("3'e");
    expect(suffix(2, 'percent', 'dat')).toBe("%2'ye");
    expect(suffix(1000000, 'number', 'dat')).toBe("1000000'a");
  });

  it('acc (belirtme) eklerini doğru üretir (-i/-ı/-u/-ü ve -yi/-yı/-yu/-yü)', () => {
    expect(suffix(3, 'number', 'acc')).toBe("3'ü");
    expect(suffix(2, 'number', 'acc')).toBe("2'yi");
    expect(suffix(40, 'number', 'acc')).toBe("40'ı");
    expect(suffix(9, 'number', 'acc')).toBe("9'u");
    expect(suffix(6, 'number', 'acc')).toBe("6'yı");
    expect(suffix(100, 'number', 'acc')).toBe("100'ü");
    expect(suffix(2026, 'year', 'acc')).toBe("2026'yı");
    expect(suffix(150000, 'money', 'acc')).toBe("₺1.500'yı");
    expect(suffix(2, 'percent', 'acc')).toBe("%2'yi");
  });

  it('gen (tamlama) eklerini doğru üretir (-in/-ın/-un/-ün ve -nin/-nın/-nun/-nün)', () => {
    expect(suffix(3, 'number', 'gen')).toBe("3'ün");
    expect(suffix(2, 'number', 'gen')).toBe("2'nin");
    expect(suffix(40, 'number', 'gen')).toBe("40'ın");
    expect(suffix(100, 'number', 'gen')).toBe("100'ün");
    expect(suffix(1000000, 'number', 'gen')).toBe("1000000'un");
    expect(suffix(2026, 'year', 'gen')).toBe("2026'nın");
    expect(suffix(150000, 'money', 'gen')).toBe("₺1.500'nın");
  });

  it('money kind için ekleri daima lira okunuşuna göre üretir', () => {
    expect(suffix(150000, 'money', 'loc')).toBe("₺1.500'da");
    expect(suffix(150000, 'money', 'dat')).toBe("₺1.500'ya");
    expect(suffix(150000, 'money', 'abl')).toBe("₺1.500'dan");
    expect(suffix(0, 'money', 'loc')).toBe("0'da");
  });

  describe('ek kenar durumları (number)', () => {
    it("5 -> 5'ten", () => {
      expect(suffix(5, 'number', 'abl')).toBe("5'ten");
    });

    it("9 -> 9'da", () => {
      expect(suffix(9, 'number', 'loc')).toBe("9'da");
    });

    it("80 -> 80'e", () => {
      expect(suffix(80, 'number', 'dat')).toBe("80'e");
    });

    it("1000000 -> 1000000'da", () => {
      expect(suffix(1000000, 'number', 'loc')).toBe("1000000'da");
    });
  });

  describe('iyelik ekleri (yalın hâl)', () => {
    it('6 iyelik kişisini doğru üretir (benim/senin/onun/bizim/sizin/onların)', () => {
      expect(suffix(3, 'number', { iyelik: 'onun' })).toBe("3'ü");
      expect(suffix(2, 'number', { iyelik: 'onun' })).toBe("2'si");
      expect(suffix(40, 'number', { iyelik: 'onun' })).toBe("40'ı");
      expect(suffix(6, 'number', { iyelik: 'onun' })).toBe("6'sı");
      expect(suffix(3, 'number', { iyelik: 'benim' })).toBe("3'üm");
      expect(suffix(2, 'number', { iyelik: 'benim' })).toBe("2'm");
      expect(suffix(40, 'number', { iyelik: 'senin' })).toBe("40'ın");
      expect(suffix(2, 'number', { iyelik: 'senin' })).toBe("2'n");
      expect(suffix(40, 'number', { iyelik: 'bizim' })).toBe("40'ımız");
      expect(suffix(2, 'number', { iyelik: 'bizim' })).toBe("2'miz");
      expect(suffix(40, 'number', { iyelik: 'sizin' })).toBe("40'ınız");
      expect(suffix(40, 'number', { iyelik: 'onların' })).toBe("40'ları");
      expect(suffix(3, 'number', { iyelik: 'onların' })).toBe("3'leri");
      expect(suffix(150000, 'money', { iyelik: 'onun' })).toBe("₺1.500'sı");
      expect(suffix(2, 'percent', { iyelik: 'onun' })).toBe("%2'si");
      expect(suffix(100, 'number', { iyelik: 'onun' })).toBe("100'ü");
      expect(suffix(100, 'number', { iyelik: 'benim' })).toBe("100'üm");
      expect(suffix(1000, 'number', { iyelik: 'onun' })).toBe("1000'i");
    });

    it('regresyon: string argüman hâlâ doğru çalışır', () => {
      expect(suffix(40, 'number', 'loc')).toBe("40'ta");
    });
  });

  describe('iyelik + hâl birleşimi (pronominal-n)', () => {
    it('onun iyeliğinde pronominal-n ile tüm hâlleri doğru üretir', () => {
      expect(suffix(3, 'number', { iyelik: 'onun', hal: 'loc' })).toBe("3'ünde");
      expect(suffix(3, 'number', { iyelik: 'onun', hal: 'dat' })).toBe("3'üne");
      expect(suffix(3, 'number', { iyelik: 'onun', hal: 'abl' })).toBe("3'ünden");
      expect(suffix(3, 'number', { iyelik: 'onun', hal: 'acc' })).toBe("3'ünü");
      expect(suffix(3, 'number', { iyelik: 'onun', hal: 'gen' })).toBe("3'ünün");
      expect(suffix(2, 'number', { iyelik: 'onun', hal: 'dat' })).toBe("2'sine");
      expect(suffix(2, 'number', { iyelik: 'onun', hal: 'loc' })).toBe("2'sinde");
      expect(suffix(40, 'number', { iyelik: 'onun', hal: 'dat' })).toBe("40'ına");
      expect(suffix(40, 'number', { iyelik: 'onun', hal: 'loc' })).toBe("40'ında");
      expect(suffix(31, 'percent', { iyelik: 'onun', hal: 'dat' })).toBe("%31'ine");
      expect(suffix(150000, 'money', { iyelik: 'onun', hal: 'dat' })).toBe("₺1.500'sına");
      expect(suffix(150000, 'money', { iyelik: 'onun', hal: 'loc' })).toBe("₺1.500'sında");
    });

    it('onların iyeliğinde pronominal-n ile hâlleri doğru üretir', () => {
      expect(suffix(40, 'number', { iyelik: 'onların', hal: 'dat' })).toBe("40'larına");
      expect(suffix(40, 'number', { iyelik: 'onların', hal: 'loc' })).toBe("40'larında");
      expect(suffix(3, 'number', { iyelik: 'onların', hal: 'dat' })).toBe("3'lerine");
    });

    it('benim/senin/bizim/sizin iyeliklerinde pronominal-n olmadan hâlleri birleştirir', () => {
      expect(suffix(40, 'number', { iyelik: 'benim', hal: 'loc' })).toBe("40'ımda");
      expect(suffix(40, 'number', { iyelik: 'benim', hal: 'dat' })).toBe("40'ıma");
      expect(suffix(40, 'number', { iyelik: 'benim', hal: 'acc' })).toBe("40'ımı");
      expect(suffix(40, 'number', { iyelik: 'senin', hal: 'dat' })).toBe("40'ına");
      expect(suffix(40, 'number', { iyelik: 'bizim', hal: 'loc' })).toBe("40'ımızda");
      expect(suffix(40, 'number', { iyelik: 'sizin', hal: 'dat' })).toBe("40'ınıza");
    });

    it('regresyon: tek başına iyelik, tek başına hâl ve string argüman doğru çalışmaya devam eder', () => {
      expect(suffix(3, 'number', { iyelik: 'onun' })).toBe("3'ü");
      expect(suffix(40, 'number', 'loc')).toBe("40'ta");
      expect(suffix(40, 'number', 'dat')).toBe("40'a");
    });
  });

  describe('tam iyelik-hâl matrisi kanıtı', () => {
    it('benim/senin/bizim/sizin + acc & gen kombinasyonlarını doğru üretir', () => {
      expect(suffix(40, 'number', { iyelik: 'benim', hal: 'gen' })).toBe("40'ımın");
      expect(suffix(40, 'number', { iyelik: 'senin', hal: 'acc' })).toBe("40'ını");
      expect(suffix(40, 'number', { iyelik: 'senin', hal: 'gen' })).toBe("40'ının");
      expect(suffix(40, 'number', { iyelik: 'bizim', hal: 'dat' })).toBe("40'ımıza");
      expect(suffix(40, 'number', { iyelik: 'bizim', hal: 'acc' })).toBe("40'ımızı");
      expect(suffix(40, 'number', { iyelik: 'bizim', hal: 'gen' })).toBe("40'ımızın");
      expect(suffix(40, 'number', { iyelik: 'sizin', hal: 'loc' })).toBe("40'ınızda");
      expect(suffix(40, 'number', { iyelik: 'sizin', hal: 'abl' })).toBe("40'ınızdan");
      expect(suffix(40, 'number', { iyelik: 'sizin', hal: 'gen' })).toBe("40'ınızın");
      expect(suffix(40, 'number', { iyelik: 'benim', hal: 'abl' })).toBe("40'ımdan");
    });

    it('onların + kalan hâlleri pronominal-n ile doğru üretir', () => {
      expect(suffix(40, 'number', { iyelik: 'onların', hal: 'abl' })).toBe("40'larından");
      expect(suffix(40, 'number', { iyelik: 'onların', hal: 'acc' })).toBe("40'larını");
      expect(suffix(40, 'number', { iyelik: 'onların', hal: 'gen' })).toBe("40'larının");
      expect(suffix(40, 'number', { iyelik: 'onların', hal: 'loc' })).toBe("40'larında");
    });

    it('ince ve yuvarlak ünlü çeşitliliği için uyumu doğru uygular', () => {
      expect(suffix(3, 'number', { iyelik: 'benim', hal: 'dat' })).toBe("3'üme");
      expect(suffix(3, 'number', { iyelik: 'bizim', hal: 'loc' })).toBe("3'ümüzde");
      expect(suffix(9, 'number', { iyelik: 'onun', hal: 'dat' })).toBe("9'una");
      expect(suffix(100, 'number', { iyelik: 'onun', hal: 'dat' })).toBe("100'üne");
      expect(suffix(1000000, 'number', { iyelik: 'onun', hal: 'loc' })).toBe("1000000'unda");
      expect(suffix(2026, 'year', { iyelik: 'onun', hal: 'dat' })).toBe("2026'sına");
    });

    it('money ve percent tam kombinasyonlarını doğru üretir', () => {
      expect(suffix(150000, 'money', { iyelik: 'onun', hal: 'abl' })).toBe("₺1.500'sından");
      expect(suffix(150000, 'money', { iyelik: 'benim', hal: 'dat' })).toBe("₺1.500'ma");
      expect(suffix(31, 'percent', { iyelik: 'onun', hal: 'loc' })).toBe("%31'inde");
      expect(suffix(31, 'percent', { iyelik: 'onun', hal: 'abl' })).toBe("%31'inden");
    });
  });
});
