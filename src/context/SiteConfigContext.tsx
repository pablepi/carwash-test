import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  SiteConfig,
  SiteConfigSchema,
  defaultSiteConfig,
  CarCategoryId,
} from '@/config/siteConfig';
import {
  DEFAULT_GOOGLE_SHEETS_URL,
  fetchConfigFromGoogleSheets,
  saveConfigToGoogleSheets,
} from '@/lib/google-sheets';

const STORAGE_KEY = 'aquadrive_site_config_v2';
const CATEGORY_STORAGE_KEY = 'aquadrive_car_category';

interface SiteConfigContextValue {
  config: SiteConfig;
  selectedCarCategory: CarCategoryId;
  setSelectedCarCategory: (category: CarCategoryId) => void;
  updateConfig: (updater: Partial<SiteConfig> | ((prev: SiteConfig) => SiteConfig)) => void;
  resetConfig: () => void;
  exportConfigAsJson: () => string;
  importConfigFromJson: (jsonStr: string) => { success: boolean; error?: string };
  syncConfigToSheets: () => Promise<{ success: boolean; message?: string }>;
  fetchConfigFromSheets: () => Promise<{ success: boolean; message?: string }>;
}

const SiteConfigContext = createContext<SiteConfigContextValue | undefined>(undefined);

export const applyThemeToDocument = (theme: SiteConfig['theme'], meta?: SiteConfig['meta']) => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const isLight = theme.mode === 'light';

  if (isLight) {
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
    document.body.style.backgroundColor = '#F2F2F7';
    document.body.style.color = '#1C1C1E';
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    document.body.style.backgroundColor = theme.bgBase || '#000000';
    document.body.style.color = theme.textColor || '#F5F5F7';
  }

  const accent = theme.accentColor || '#00C7BE';
  const accentHover = theme.accentHover && theme.accentHover !== accent ? theme.accentHover : accent;

  // Accent colors
  root.style.setProperty('--apple-accent-turquoise', accent);
  root.style.setProperty('--apple-accent-blue', accent);
  root.style.setProperty('--color-accent', accent);
  root.style.setProperty('--apple-accent-turquoise-hover', accentHover);
  root.style.setProperty('--apple-accent-blue-hover', accentHover);
  root.style.setProperty('--apple-accent-turquoise-subtle', `${accent}25`);
  root.style.setProperty('--apple-accent-blue-subtle', `${accent}25`);
  root.style.setProperty('--apple-border-accent', `${accent}80`);
  root.style.setProperty('--apple-accent-blue-glow', `0 0 24px -2px ${accent}80`);
  root.style.setProperty('--apple-accent-turquoise-glow', `0 0 24px -2px ${accent}80`);

  // Surfaces & Base colors
  if (isLight) {
    root.style.setProperty('--apple-bg-base', '#F2F2F7');
    root.style.setProperty('--apple-bg-card', '#FFFFFF');
    root.style.setProperty('--apple-bg-elevated', '#FFFFFF');
    root.style.setProperty('--apple-bg-surface', '#F2F2F7');
    root.style.setProperty('--apple-bg-hover', '#E5E5EA');
    root.style.setProperty('--apple-border-subtle', 'rgba(0, 0, 0, 0.08)');
    root.style.setProperty('--apple-border-medium', 'rgba(0, 0, 0, 0.16)');
    root.style.setProperty('--apple-text-primary', '#1C1C1E');
    root.style.setProperty('--apple-text-secondary', '#636366');
    root.style.setProperty('--apple-text-tertiary', '#8E8E93');
    root.style.setProperty('--apple-text-muted', '#8E8E93');
  } else {
    root.style.setProperty('--apple-bg-base', theme.bgBase || '#000000');
    root.style.setProperty('--apple-bg-card', theme.cardBg || '#161618');
    root.style.setProperty('--apple-bg-elevated', '#1C1C1E');
    root.style.setProperty('--apple-bg-surface', '#242426');
    root.style.setProperty('--apple-bg-hover', '#2C2C2E');
    root.style.setProperty('--apple-border-subtle', 'rgba(255, 255, 255, 0.08)');
    root.style.setProperty('--apple-border-medium', 'rgba(255, 255, 255, 0.14)');
    root.style.setProperty('--apple-text-primary', theme.textColor || '#F5F5F7');
    root.style.setProperty('--apple-text-secondary', '#86868B');
    root.style.setProperty('--apple-text-tertiary', '#A1A1A6');
  }

  // Meta updates
  if (meta?.title) {
    document.title = meta.title;
  }
  if (meta?.description) {
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', meta.description);
    }
  }
};

const getInitialConfig = (): SiteConfig => {
  if (typeof window === 'undefined') return defaultSiteConfig;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSiteConfig;
    const parsed = JSON.parse(raw);
    const validation = SiteConfigSchema.safeParse(parsed);
    if (validation.success) {
      const data = validation.data;
      if (
        data.integrations?.googleSheetsUrl?.includes('AKfycbx29aSPAPewTU-NIhljGt3yhgC7tl3YYTvAfxv88DgdfQ06_Jubx4h3E9FrzAT00meGAg')
      ) {
        data.integrations.googleSheetsUrl = defaultSiteConfig.integrations.googleSheetsUrl;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {}
      }
      return data;
    }
    console.warn('Stored config was invalid, falling back to default:', validation.error);
    return defaultSiteConfig;
  } catch (err) {
    console.error('Failed to read config from localStorage:', err);
    return defaultSiteConfig;
  }
};

const getInitialCarCategory = (): CarCategoryId => {
  if (typeof window === 'undefined') return 'sedan';
  try {
    const stored = localStorage.getItem(CATEGORY_STORAGE_KEY);
    if (stored === 'sedan' || stored === 'crossover' || stored === 'suv') {
      return stored;
    }
  } catch {
    // fallback
  }
  return 'sedan';
};

export const SiteConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<SiteConfig>(getInitialConfig);
  const [selectedCarCategory, setSelectedCarCategoryState] = useState<CarCategoryId>(getInitialCarCategory);

  // Sync theme to DOM on every config change
  useEffect(() => {
    applyThemeToDocument(config.theme, config.meta);
  }, [config.theme, config.meta]);

  // Try to load remote shared config from Google Sheets on initial load and periodically
  useEffect(() => {
    const sheetsUrl = (config as any).integrations?.googleSheetsUrl || DEFAULT_GOOGLE_SHEETS_URL;
    if (!sheetsUrl) return;

    const pullRemoteConfig = () => {
      fetchConfigFromGoogleSheets(sheetsUrl)
        .then((remoteData) => {
          if (remoteData) {
            const validation = SiteConfigSchema.safeParse(remoteData);
            if (validation.success) {
              setConfig((prev) => ({
                ...prev,
                ...validation.data,
                statusOverrides: {
                  ...(prev.statusOverrides || {}),
                  ...((validation.data as any).statusOverrides || {}),
                },
              }));
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(validation.data));
              } catch {}
            }
          }
        })
        .catch(() => {});
    };

    pullRemoteConfig();
    const timer = setInterval(pullRemoteConfig, 20000);
    return () => clearInterval(timer);
  }, []);

  const setSelectedCarCategory = useCallback((category: CarCategoryId) => {
    setSelectedCarCategoryState(category);
    try {
      localStorage.setItem(CATEGORY_STORAGE_KEY, category);
    } catch (e) {
      console.error('Failed to save category preference:', e);
    }
  }, []);

  const updateConfig = useCallback((updater: Partial<SiteConfig> | ((prev: SiteConfig) => SiteConfig)) => {
    setConfig((prev) => {
      let next: SiteConfig;
      if (typeof updater === 'function') {
        next = updater(prev);
      } else {
        next = {
          ...prev,
          ...updater,
          meta: updater.meta ? { ...prev.meta, ...updater.meta } : prev.meta,
          branding: updater.branding ? { ...prev.branding, ...updater.branding } : prev.branding,
          theme: updater.theme ? { ...prev.theme, ...updater.theme } : prev.theme,
          contacts: updater.contacts ? { ...prev.contacts, ...updater.contacts } : prev.contacts,
          workflow: updater.workflow ? { ...prev.workflow, ...updater.workflow } : prev.workflow,
          statusOverrides: (updater as any).statusOverrides
            ? { ...((prev as any).statusOverrides || {}), ...(updater as any).statusOverrides }
            : (prev as any).statusOverrides || {},
        };
      }

      // Validate against schema
      const validation = SiteConfigSchema.safeParse(next);
      if (!validation.success) {
        console.error('Invalid site config update:', validation.error);
        return prev;
      }

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(validation.data));
      } catch (err) {
        console.error('Failed to persist site config to localStorage:', err);
      }

      return validation.data;
    });
  }, []);

  const resetConfig = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Failed to clear storage:', err);
    }
    setConfig(defaultSiteConfig);
    applyThemeToDocument(defaultSiteConfig.theme, defaultSiteConfig.meta);
  }, []);

  const exportConfigAsJson = useCallback((): string => {
    return JSON.stringify(config, null, 2);
  }, [config]);

  const importConfigFromJson = useCallback((jsonStr: string): { success: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(jsonStr);
      const validation = SiteConfigSchema.safeParse(parsed);
      if (!validation.success) {
        const issues = validation.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        return { success: false, error: issues };
      }
      setConfig(validation.data);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(validation.data));
      } catch (e) {
        console.error('Failed to save imported config:', e);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Invalid JSON format' };
    }
  }, []);

  const syncConfigToSheets = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    const sheetsUrl = (config as any).integrations?.googleSheetsUrl || DEFAULT_GOOGLE_SHEETS_URL;
    return await saveConfigToGoogleSheets(config, sheetsUrl);
  }, [config]);

  const fetchConfigFromSheets = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    const sheetsUrl = (config as any).integrations?.googleSheetsUrl || DEFAULT_GOOGLE_SHEETS_URL;
    try {
      const remote = await fetchConfigFromGoogleSheets(sheetsUrl);
      if (!remote) {
        return { success: false, message: 'Настройки в Google Таблице пока не найдены' };
      }
      const validation = SiteConfigSchema.safeParse(remote);
      if (!validation.success) {
        return { success: false, message: 'Неверный формат настроек в таблице' };
      }
      setConfig(validation.data);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(validation.data));
      } catch {}
      return { success: true, message: 'Настройки успешно загружены из Google Таблицы' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Ошибка загрузки настроек' };
    }
  }, [config]);

  return (
    <SiteConfigContext.Provider
      value={{
        config,
        selectedCarCategory,
        setSelectedCarCategory,
        updateConfig,
        resetConfig,
        exportConfigAsJson,
        importConfigFromJson,
        syncConfigToSheets,
        fetchConfigFromSheets,
      }}
    >
      {children}
    </SiteConfigContext.Provider>
  );
};

export const useSiteConfig = (): SiteConfigContextValue => {
  const context = useContext(SiteConfigContext);
  if (!context) {
    throw new Error('useSiteConfig must be used within a SiteConfigProvider');
  }
  return context;
};
