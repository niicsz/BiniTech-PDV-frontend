interface Window {
  __env?: {
    apiBase?: string;
    importApiBase?: string;
    fiscalApiBase?: string;
    gaMeasurementId?: string;
  };
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
}
