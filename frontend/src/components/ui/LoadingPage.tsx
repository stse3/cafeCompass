import { Loading } from './Loading';

interface LoadingPageProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingPage({ 
  message = 'Loading...', 
  size = 'md' 
}: LoadingPageProps) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <Loading message={message} size={size} />
    </div>
  );
}