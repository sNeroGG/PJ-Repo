import { supabase, isSupabaseConfigured } from '../../../lib/supabaseClient';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Generar un nombre único para evitar colisiones
    const originalName = file.name || 'image.png';
    const ext = path.extname(originalName) || '.png';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `flyer-${uniqueSuffix}${ext}`;

    // Intentar subir a Supabase Storage si está configurado
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.storage
          .from('flyers')
          .upload(filename, buffer, {
            contentType: file.type || 'image/png',
            cacheControl: '3600',
            upsert: true,
          });

        if (error) {
          console.warn('Error al subir a Supabase storage, usando fallback local:', error.message);
        } else if (data) {
          // Obtener la URL pública del archivo subido
          const { data: publicUrlData } = supabase.storage
            .from('flyers')
            .getPublicUrl(filename);
          
          if (publicUrlData?.publicUrl) {
            return NextResponse.json({ url: publicUrlData.publicUrl });
          }
        }
      } catch (sbError) {
        console.warn('Excepción al subir a Supabase, usando fallback local:', sbError);
      }
    }
    
    // Fallback: Guardar localmente en public/uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    // Asegurar que el directorio de subida existe
    await fs.mkdir(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);
    
    // URL relativa para servir estáticos desde Next.js
    const fileUrl = `/uploads/${filename}`;
    
    return NextResponse.json({ url: fileUrl });
  } catch (error) {
    console.error('Error en el endpoint de subida de archivos:', error);
    return NextResponse.json({ error: 'Error interno del servidor al procesar el archivo.' }, { status: 500 });
  }
}
