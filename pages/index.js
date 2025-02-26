import Head from 'next/head';
import dynamic from 'next/dynamic';

// Dynamically import the ChatComponent with no SSR
const ChatComponent = dynamic(() => import('@/components/ChatComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  )
});

export default function Home() {
  return (
    <>
      <Head>
        <title>CobaltChat</title>
        <meta name="description" content="Une application de chat en temps réel construite avec Next.js et Firebase" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <main className="container mx-auto py-8">
        <ChatComponent />
      </main>
      
      <footer className="mt-8 py-4 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} CobaltChat - Tous droits réservés</p>
      </footer>
    </>
  );
}