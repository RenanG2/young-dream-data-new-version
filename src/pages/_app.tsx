import type { AppProps } from 'next/app';
import Head from 'next/head';
import { Inter } from 'next/font/google';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

// Um único ToastContainer para o app inteiro (antes havia um por página + um no layout, duplicando avisos).
export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={inter.className}>
      <Head>
        <title>Young Dream Data</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Young Dream Data: ambiente virtual de aprendizagem" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
      <ToastContainer theme="dark" position="top-right" autoClose={4000} />
    </div>
  );
}
