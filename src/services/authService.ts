import { supabase } from '../supabaseClient';
import bcrypt from 'bcryptjs';

export const login = async (username: string, password: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error('Usuario no encontrado');
  }

  const valid = await bcrypt.compare(password, data.password);
  if (!valid) throw new Error('Contraseña incorrecta');

  return {
    id: data.id,
    username: data.username,
    role: data.role,
    name: data.name
  };
};
