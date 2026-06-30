'use client';

import React, { useState } from 'react';
import Navbar from './components/Navbar/Navbar';
import Banner from './components/banner-landing/banner-lan';
import SinaiJourney from './components/SinaiJourney.module/SinaiJourney.module';
import styles from './LandingPage.module.css';

export default function LandingPage() {
  const [activeTripSlug, setActiveTripSlug] = useState<string>('');
  return (
    <main className={styles.main}>
      <Navbar />
      <Banner onSlideChange={setActiveTripSlug} />
      <SinaiJourney tripSlug={activeTripSlug} />
    </main>
  );
}