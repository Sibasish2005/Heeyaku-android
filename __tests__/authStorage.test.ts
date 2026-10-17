import { authStorage, EmployeeSession } from '../src/services/authStorage';
import { NativeModules } from 'react-native';

describe('authStorage service', () => {
  const mockSession: EmployeeSession = {
    token: 'jwt.mock.token.payload',
    employee: {
      id: 'emp-123',
      employeeCode: 'BDA-001',
      name: 'Agent Test',
      email: 'agent@heeyaku.test',
      phoneNumber: '+919876543210',
      team: 'Alpha Squad',
      teamId: 'team-001',
      role: 'BDA',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves session to native storage and memory cache', async () => {
    await authStorage.saveSession(mockSession);
    expect(NativeModules.CallTracker.setItem).toHaveBeenCalledWith(
      'heeyaku_employee_session',
      JSON.stringify(mockSession),
    );

    const session = await authStorage.getSession();
    expect(session).toEqual(mockSession);
  });

  it('clears session from native storage and memory', async () => {
    await authStorage.saveSession(mockSession);
    await authStorage.clearSession();

    expect(NativeModules.CallTracker.removeItem).toHaveBeenCalledWith('heeyaku_employee_session');
    
    // When cache is cleared and native storage returns null
    (NativeModules.CallTracker.getItem as jest.Mock).mockResolvedValueOnce(null);
    const session = await authStorage.getSession();
    expect(session).toBeNull();
  });

  it('triggers unauthorized listeners when notifyUnauthorized is called', () => {
    const listener = jest.fn();
    const unsubscribe = authStorage.onUnauthorized(listener);

    authStorage.notifyUnauthorized();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    authStorage.notifyUnauthorized();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('saves and retrieves server URL properly', async () => {
    await authStorage.saveServerUrl('https://heeyaku.com');
    expect(NativeModules.CallTracker.setItem).toHaveBeenCalledWith(
      'heeyaku_server_url',
      'https://heeyaku.com',
    );

    (NativeModules.CallTracker.getItem as jest.Mock).mockResolvedValueOnce('https://heeyaku.com');
    const url = await authStorage.getServerUrl();
    expect(url).toBe('https://heeyaku.com');
  });
});
