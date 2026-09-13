import { supabase, isSupabaseConfigured, getSupabaseClient } from './supabaseClient';
import { CurrentUser, UserRole, Employee } from '../types';
import { INITIAL_EMPLOYEES } from '../constants/pharmacy';

export interface PredefinedUser {
  id: string;
  name: string;
  role: UserRole;
  defaultEmail: string;
  avatarColor: string;
  roleLabel: string;
}

export const PREDEFINED_USERS: PredefinedUser[] = INITIAL_EMPLOYEES.map(emp => ({
  id: emp.id,
  name: emp.name,
  role: emp.role,
  defaultEmail: emp.email || `${emp.name.toLowerCase()}@mondino.com`,
  avatarColor: emp.avatarColor || '#0d9488',
  roleLabel: emp.role === 'admin' ? 'Administrador' : 'Empleado',
}));

export interface AuthSessionData {
  user: CurrentUser;
  supabaseUser: any;
  profile: any;
  employee: any;
}

const LOCAL_SESSION_KEY = 'mondino_authenticated_session';

export const AuthService = {
  getPredefinedUsers(): PredefinedUser[] {
    return PREDEFINED_USERS;
  },

  getPredefinedUserByName(name: string): PredefinedUser | undefined {
    return PREDEFINED_USERS.find(
      u => u.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
  },

  /**
   * Fetch active staff for login selector. Queries Supabase 'employees' table first.
   */
  async getStaffForLogin(): Promise<PredefinedUser[]> {
    const client = getSupabaseClient();
    if (isSupabaseConfigured() && client) {
      try {
        const { data, error } = await client
          .from('employees')
          .select('*')
          .order('name', { ascending: true });

        if (!error && Array.isArray(data) && data.length > 0) {
          return data
            .filter((e: any) => e.active !== false)
            .map((e: any) => ({
              id: e.id,
              name: e.name,
              role: (e.role === 'admin' ? 'admin' : 'employee') as UserRole,
              defaultEmail: e.email || `${e.name.toLowerCase().trim()}@mondino.com`,
              avatarColor: e.avatar_color || e.avatarColor || '#0d9488',
              roleLabel: e.role === 'admin' ? 'Administrador' : 'Empleado',
            }));
        }
      } catch (err) {
        console.warn('Could not fetch employees from Supabase for login, using initial list:', err);
      }
    }
    return PREDEFINED_USERS;
  },

  /**
   * Resolve email for a given user name or email input.
   */
  async resolveEmailForUser(userNameOrEmail: string): Promise<string> {
    const clean = userNameOrEmail.trim();
    if (clean.includes('@')) {
      return clean.toLowerCase();
    }

    const client = getSupabaseClient();
    if (isSupabaseConfigured() && client) {
      try {
        const { data, error } = await client
          .from('employees')
          .select('email')
          .ilike('name', clean)
          .maybeSingle();

        if (!error && data?.email) {
          return data.email.trim().toLowerCase();
        }
      } catch (err) {
        // Fallback to default format
      }
    }

    const predefined = this.getPredefinedUserByName(clean);
    if (predefined?.defaultEmail) {
      return predefined.defaultEmail;
    }

    return `${clean.toLowerCase()}@mondino.com`;
  },

  /**
   * Log in using real Supabase Auth.
   * Eliminates hardcoded passwords from the codebase.
   */
  async loginWithSupabase(
    userNameOrEmail: string,
    password: string
  ): Promise<AuthSessionData> {
    const cleanInput = (userNameOrEmail || '').trim();
    const cleanPassword = (password || '').trim();

    if (!cleanInput) {
      throw new Error('Por favor, selecciona o ingresa tu usuario.');
    }
    if (!cleanPassword) {
      throw new Error('Por favor, ingresa tu contraseña.');
    }

    const client = getSupabaseClient();
    const isConfigured = isSupabaseConfigured() && Boolean(client);

    if (!isConfigured || !client) {
      throw new Error(
        'Supabase no está configurado. Por favor, ingresa la URL y la Anon Key en el panel de configuración de Supabase arriba para conectar la base de datos.'
      );
    }

    // 1. Resolve email address to authenticate with Supabase Auth
    const resolvedEmail = await this.resolveEmailForUser(cleanInput);

    // 2. Authenticate directly via Supabase Auth
    const { data: authData, error: authError } = await client.auth.signInWithPassword({
      email: resolvedEmail,
      password: cleanPassword,
    });

    if (authError || !authData?.user) {
      console.warn('Supabase Auth error:', authError);
      if (authError?.message?.toLowerCase().includes('invalid login credentials')) {
        throw new Error('Contraseña o correo incorrectos. Por favor, verifica los datos ingresados.');
      }
      throw new Error(authError?.message || 'Error al autenticar con Supabase. Verifica tus datos.');
    }

    const authUser = authData.user;

    // 3. Fetch user profile from public.profiles
    let profile: any = null;
    try {
      const { data: profileById } = await client
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileById) {
        profile = profileById;
      } else {
        const { data: profileByUserId } = await client
          .from('profiles')
          .select('*')
          .eq('user_id', authUser.id)
          .maybeSingle();
        profile = profileByUserId;
      }
    } catch (err) {
      console.warn('Error fetching profile from public.profiles:', err);
    }

    // 4. Fetch corresponding employee record from public.employees
    let employee: any = null;
    try {
      if (profile?.employee_id) {
        const { data: empById } = await client
          .from('employees')
          .select('*')
          .eq('id', profile.employee_id)
          .maybeSingle();
        employee = empById;
      }

      if (!employee && authUser.email) {
        const { data: empByEmail } = await client
          .from('employees')
          .select('*')
          .ilike('email', authUser.email)
          .maybeSingle();
        employee = empByEmail;
      }

      if (!employee) {
        const { data: empByName } = await client
          .from('employees')
          .select('*')
          .ilike('name', cleanInput)
          .maybeSingle();
        employee = empByName;
      }
    } catch (err) {
      console.warn('Error fetching employee record:', err);
    }

    // 5. Determine Role: Only 'admin' or 'employee'
    let resolvedRole: UserRole = 'employee';
    if (profile?.role) {
      resolvedRole = String(profile.role).toLowerCase() === 'admin' ? 'admin' : 'employee';
    } else if (employee?.role) {
      resolvedRole = String(employee.role).toLowerCase() === 'admin' ? 'admin' : 'employee';
    } else {
      // Default admin rule for pharmacy directors Fernando and Yanina
      const resolvedName = employee?.name || profile?.full_name || cleanInput;
      if (
        resolvedName.toLowerCase().includes('fernando') ||
        resolvedName.toLowerCase().includes('yanina')
      ) {
        resolvedRole = 'admin';
      }
    }

    const displayName =
      employee?.name ||
      profile?.full_name ||
      cleanInput.split('@')[0];

    const currentUser: CurrentUser = {
      id: employee?.id || authUser.id,
      name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
      role: resolvedRole,
      email: authUser.email || resolvedEmail,
    };

    const sessionResult: AuthSessionData = {
      user: currentUser,
      supabaseUser: authUser,
      profile,
      employee,
    };

    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(sessionResult));
    return sessionResult;
  },

  /**
   * Check if a valid session exists in Supabase Auth or cache.
   */
  async checkCurrentSession(): Promise<AuthSessionData | null> {
    const client = getSupabaseClient();

    if (isSupabaseConfigured() && client) {
      try {
        const { data: sessionData, error: sessionError } = await client.auth.getSession();
        if (!sessionError && sessionData.session?.user) {
          const authUser = sessionData.session.user;

          // 1. Fetch profile
          let profile: any = null;
          const { data: pData } = await client
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();

          profile = pData;

          // 2. Fetch employee
          let employee: any = null;
          if (profile?.employee_id) {
            const { data: eData } = await client
              .from('employees')
              .select('*')
              .eq('id', profile.employee_id)
              .maybeSingle();
            employee = eData;
          } else if (authUser.email) {
            const { data: eData } = await client
              .from('employees')
              .select('*')
              .ilike('email', authUser.email)
              .maybeSingle();
            employee = eData;
          }

          let resolvedRole: UserRole = 'employee';
          if (profile?.role) {
            resolvedRole = String(profile.role).toLowerCase() === 'admin' ? 'admin' : 'employee';
          } else if (employee?.role) {
            resolvedRole = String(employee.role).toLowerCase() === 'admin' ? 'admin' : 'employee';
          } else {
            const nameCheck = (employee?.name || authUser.email || '').toLowerCase();
            if (nameCheck.includes('fernando') || nameCheck.includes('yanina')) {
              resolvedRole = 'admin';
            }
          }

          const displayName = employee?.name || profile?.full_name || authUser.email?.split('@')[0] || 'Usuario';

          const currentUser: CurrentUser = {
            id: employee?.id || authUser.id,
            name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
            role: resolvedRole,
            email: authUser.email,
          };

          const session: AuthSessionData = {
            user: currentUser,
            supabaseUser: authUser,
            profile,
            employee,
          };

          localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
          return session;
        }
      } catch (err) {
        console.warn('Error checking Supabase session:', err);
      }
    }

    // Check cached session for offline viewing
    const saved = localStorage.getItem(LOCAL_SESSION_KEY);
    if (saved) {
      try {
        const parsed: AuthSessionData = JSON.parse(saved);
        if (parsed?.user?.name) {
          return parsed;
        }
      } catch (e) {
        localStorage.removeItem(LOCAL_SESSION_KEY);
      }
    }

    return null;
  },

  /**
   * Sign out from Supabase Auth and clear local session
   */
  async signOut(): Promise<void> {
    localStorage.removeItem(LOCAL_SESSION_KEY);
    const client = getSupabaseClient();
    if (isSupabaseConfigured() && client) {
      try {
        await client.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut error:', err);
      }
    }
  },
};
