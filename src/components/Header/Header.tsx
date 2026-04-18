import "./Header.css";

interface HeaderProps {
  sport: string;
}

export function Header({ sport }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-brand">
          <div className="header-logo">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path
                d="M12 2a10 10 0 0 1 0 20"
                fill="currentColor"
                opacity="0.2"
              />
              <path
                d="M12 2a10 10 0 0 0 0 20"
                fill="currentColor"
                opacity="0.2"
              />
              <path d="M2 12h20" />
              <path d="M12 2c2.5 2.5 4 6 4 10s-1.5 7.5-4 10c-2.5-2.5-4-6-4-10s1.5-7.5 4-10" />
            </svg>
          </div>
          <h1 className="header-title">Sunday Padel</h1>
        </div>
        {sport && (
          <div className="header-badge">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            {sport}
          </div>
        )}
      </div>
    </header>
  );
}
