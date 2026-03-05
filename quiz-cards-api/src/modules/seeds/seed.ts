import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { DataSource } from 'typeorm';
import { CardList } from '../card-lists/card-list.entity';
import { Card, CardType } from '../cards/card.entity';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  const dataSource = app.get(DataSource);

  const cardListRepo = dataSource.getRepository(CardList);
  const cardRepo = dataSource.getRepository(Card);

  // Clear existing seed data (idempotent re-runs)
  await cardListRepo.delete({ title: 'Allgemeinwissen' });
  await cardListRepo.delete({ title: 'Englisch–Deutsch Vokabeln' });

  // ── Seed 1: General Knowledge ──────────────────────────────────────────────
  const generalList = cardListRepo.create({
    title: 'Allgemeinwissen',
    description: 'Mix aus Geografie, Geschichte und Wissenschaft',
    bgColor: '#6C63FF',
  });
  await cardListRepo.save(generalList);

  const generalCards: Partial<Card>[] = [
    {
      type: CardType.QA,
      front: 'Hauptstadt von Frankreich?',
      back: 'Paris',
      bgColor: '#FF6584',
      position: 0,
    },
    {
      type: CardType.MULTIPLE_CHOICE,
      front: 'Welches Element hat das chemische Symbol "O"?',
      options: ['Gold', 'Osmium', 'Sauerstoff', 'Silber'],
      correctIndex: 2,
      back: 'Sauerstoff',
      bgColor: '#43CBFF',
      position: 1,
    },
    {
      type: CardType.QA,
      front: 'In welchem Jahr fiel die Berliner Mauer?',
      back: '1989',
      position: 2,
    },
    {
      type: CardType.MULTIPLE_CHOICE,
      front: 'Wie viele Kontinente gibt es auf der Erde?',
      options: ['5', '6', '7', '8'],
      correctIndex: 2,
      back: '7',
      bgColor: '#F7971E',
      position: 3,
    },
    {
      type: CardType.QA,
      front: 'Wer schrieb "Romeo und Julia"?',
      back: 'William Shakespeare',
      bgColor: '#9708CC',
      position: 4,
    },
    {
      type: CardType.MULTIPLE_CHOICE,
      front: 'Was ist die schnellste Kreatur der Welt?',
      options: [
        'Gepard',
        'Falke (Stoßflug)',
        'Schwertfisch',
        'Gepard (Wasser)',
      ],
      correctIndex: 1,
      back: 'Falke (im Stoßflug)',
      position: 5,
    },
    {
      type: CardType.QA,
      front: 'Wie viele Planeten hat unser Sonnensystem?',
      back: '8',
      bgColor: '#00D4AA',
      position: 6,
    },
    {
      type: CardType.MULTIPLE_CHOICE,
      front: 'Welche Sprache wird in Brasilien gesprochen?',
      options: ['Spanisch', 'Portugiesisch', 'Englisch', 'Brasilianisch'],
      correctIndex: 1,
      back: 'Portugiesisch',
      position: 7,
    },
    {
      type: CardType.QA,
      front: 'Was ist die kleinste Primzahl?',
      back: '2',
      position: 8,
    },
    {
      type: CardType.MULTIPLE_CHOICE,
      front: 'Welcher Ozean ist der größte?',
      options: ['Atlantik', 'Indik', 'Arktis', 'Pazifik'],
      correctIndex: 3,
      back: 'Pazifik',
      bgColor: '#FF6584',
      position: 9,
    },
  ];

  await cardRepo.save(
    generalCards.map((c) =>
      cardRepo.create({ ...c, cardListId: generalList.id }),
    ),
  );

  // ── Seed 2: English–German Vocabulary ─────────────────────────────────────
  const vocabList = cardListRepo.create({
    title: 'Englisch–Deutsch Vokabeln',
    description: 'Einfache englische Wörter auf Deutsch übersetzen',
    bgColor: '#43CBFF',
  });
  await cardListRepo.save(vocabList);

  const vocabCards: Partial<Card>[] = [
    {
      type: CardType.QA,
      front: 'apple',
      back: 'Apfel',
      bgColor: '#FF6584',
      position: 0,
    },
    {
      type: CardType.QA,
      front: 'butterfly',
      back: 'Schmetterling',
      bgColor: '#6C63FF',
      position: 1,
    },
    { type: CardType.QA, front: 'umbrella', back: 'Regenschirm', position: 2 },
    {
      type: CardType.QA,
      front: 'strawberry',
      back: 'Erdbeere',
      bgColor: '#F7971E',
      position: 3,
    },
    {
      type: CardType.QA,
      front: 'cloud',
      back: 'Wolke',
      bgColor: '#00D4AA',
      position: 4,
    },
    { type: CardType.QA, front: 'lighthouse', back: 'Leuchtturm', position: 5 },
    {
      type: CardType.QA,
      front: 'spider',
      back: 'Spinne',
      bgColor: '#9708CC',
      position: 6,
    },
    { type: CardType.QA, front: 'thunder', back: 'Donner', position: 7 },
    {
      type: CardType.QA,
      front: 'mirror',
      back: 'Spiegel',
      bgColor: '#FF6584',
      position: 8,
    },
    {
      type: CardType.QA,
      front: 'bridge',
      back: 'Brücke',
      bgColor: '#43CBFF',
      position: 9,
    },
  ];

  await cardRepo.save(
    vocabCards.map((c) => cardRepo.create({ ...c, cardListId: vocabList.id })),
  );

  console.log('✅ Seed completed: 2 card lists with 10 cards each');
  await app.close();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
