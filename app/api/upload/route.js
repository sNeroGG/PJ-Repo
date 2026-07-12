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

    let buffer;
    if (typeof file.arrayBuffer === 'function') {
      buffer = Buffer.from(await file.arrayBuffer());
    } else if (file.stream && typeof file.stream === 'function') {
      const chunks = [];
      const stream = file.stream();
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      buffer = Buffer.concat(chunks);
    } else {
      buffer = Buffer.from(file);
    }
    
    // Generar un nombre único para evitar colisiones
    const originalName = file.name || 'file.png';
    const ext = path.extname(originalName) || '.png';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `file-${uniqueSuffix}${ext}`;

    const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;

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
          console.warn('Error al subir a Supabase storage:', error.message);
          if (isServerless) {
            return NextResponse.json({ error: `Error de Supabase: ${error.message}. Por favor verifica tus credenciales y que el bucket 'flyers' exista en tu proyecto.` }, { status: 400 });
          }
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
        console.error('Excepción al subir a Supabase:', sbError);
        if (isServerless) {
          return NextResponse.json({ error: `Excepción de conexión con Supabase: ${sbError.message}` }, { status: 500 });
        }
      }
    }
    
    if (isServerless) {
      return NextResponse.json({ error: 'La subida de archivos local no está soportada en Vercel. Por favor, configura las variables de entorno de Supabase.' }, { status: 400 });
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
    return NextResponse.json({ error: `Error interno del servidor al procesar el archivo: ${error.message}` }, { status: 500 });
  }
}
