import { supabase } from '../supabaseClient';
import bcrypt from 'bcryptjs';

export const login = async (username: string, password: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .limit(1);

  if (error || !data || data.length === 0) {
    throw new Error('Usuario no encontrado');
  }

  const user = data[0];

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error('Contraseña incorrecta');

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name
  };
};
