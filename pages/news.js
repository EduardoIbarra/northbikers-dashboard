import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { FiArrowLeft, FiEye, FiFilePlus, FiImage, FiPlus, FiSave, FiTrash2, FiUpload } from 'react-icons/fi';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'react-quill/dist/quill.snow.css';
import { getSupabase } from '../utils/supabase';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false, loading: () => <p className="text-gray-400">Cargando editor…</p> });
const OWNER_EMAIL = 'eduardoibarra904@gmail.com';
const PROJECT_REF = 'aezxnubglexywadbjpgo';
const EMPTY_FORM = { title: '', extract: '', body: '', status: 'draft' };
const QUILL_MODULES = {
  toolbar: [
    [{ header: [2, 3, false] }], ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }], ['blockquote', 'link'], ['clean'],
  ],
};

export default function NewsAdmin() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabase(), []);
  const editorRef = useRef(null);
  const imageInputRef = useRef(null);
  const savedSelection = useRef(null);
  const [access, setAccess] = useState('checking');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [posts, setPosts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [images, setImages] = useState([]);
  const [coverImage, setCoverImage] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [imageCaption, setImageCaption] = useState('');

  useEffect(() => {
    const authUser = supabase.auth.user();
    if (!authUser) {
      setAccess('denied');
      router.replace('/login');
      return;
    }
    if (authUser.email?.toLowerCase() !== OWNER_EMAIL) {
      setAccess('denied');
      return;
    }
    setAccess('allowed');
  }, [router, supabase]);

  const loadPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('news')
      .select('id,title,extract,body,images,image_metadata,cover_image_url,status,published_at,created_at,updated_at,likes_count,shares_count,comments_count')
      .order('created_at', { ascending: false });
    if (error) toast.error(`No se pudieron cargar las noticias: ${error.message}`);
    else setPosts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (access === 'allowed') loadPosts();
  }, [access]);

  const resetEditor = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImages([]);
    setCoverImage('');
    setPendingFile(null);
    setImageCaption('');
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const editPost = (post) => {
    const urls = Array.isArray(post.images)
      ? post.images.map(item => typeof item === 'string' ? item : item?.url).filter(Boolean)
      : [];
    const metadata = Array.isArray(post.image_metadata) ? post.image_metadata : [];
    setEditingId(post.id);
    setForm({ title: post.title || '', extract: post.extract || '', body: post.body || '', status: post.status || 'published' });
    setImages(urls.map(url => ({ url, caption: metadata.find(item => item?.url === url)?.caption || '' })));
    setCoverImage(post.cover_image_url || urls[0] || '');
    setPendingFile(null);
    setImageCaption('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openImagePicker = () => {
    const quill = editorRef.current?.getEditor();
    savedSelection.current = quill?.getSelection(true) || { index: Math.max((quill?.getLength() || 1) - 1, 0), length: 0 };
    imageInputRef.current?.click();
  };

  const insertImageAtCursor = (url, caption) => {
    const quill = editorRef.current?.getEditor();
    if (!quill) return;
    const selection = savedSelection.current || { index: Math.max(quill.getLength() - 1, 0), length: 0 };
    const safeUrl = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const safeCaption = caption.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '<br>');
    const html = `<p><img src="${safeUrl}" alt="${safeCaption}" /></p>${caption.trim() ? `<p><em>${safeCaption}</em></p>` : ''}<p><br></p>`;
    quill.clipboard.dangerouslyPasteHTML(selection.index, html, 'user');
    const nextSelection = quill.getSelection();
    if (nextSelection) quill.setSelection(nextSelection.index, 0, 'silent');
  };

  const uploadAndInsertImage = async () => {
    if (!pendingFile) {
      toast.error('Selecciona una imagen primero.');
      return;
    }
    if (!pendingFile.type.startsWith('image/')) {
      toast.error('El archivo debe ser una imagen.');
      return;
    }

    setUploading(true);
    const extension = pendingFile.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const objectPath = `news/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
    const { error } = await supabase.storage.from('pictures').upload(objectPath, pendingFile, {
      cacheControl: '3600', upsert: false, contentType: pendingFile.type,
    });
    if (error) {
      toast.error(`No se pudo subir la imagen: ${error.message}`);
      setUploading(false);
      return;
    }

    const publicUrl = `https://${PROJECT_REF}.supabase.co/storage/v1/object/public/pictures/${objectPath}`;
    const media = { url: publicUrl, caption: imageCaption.trim() };
    setImages(prev => [...prev, media]);
    setCoverImage(current => current || publicUrl);
    insertImageAtCursor(publicUrl, media.caption);
    setPendingFile(null);
    setImageCaption('');
    if (imageInputRef.current) imageInputRef.current.value = '';
    setUploading(false);
    toast.success('Imagen insertada en la noticia.');
  };

  const savePost = async (nextStatus = form.status) => {
    if (!form.title.trim()) {
      toast.error('Escribe un título para la noticia.');
      return;
    }
    if (!form.body.replace(/<[^>]*>/g, '').trim() && images.length === 0) {
      toast.error('Agrega el contenido de la noticia.');
      return;
    }
    setSaving(true);
    const currentUser = supabase.auth.user();
    const existing = posts.find(post => post.id === editingId);
    const payload = {
      title: form.title.trim(),
      extract: form.extract.trim() || null,
      body: form.body,
      images: images.map(image => image.url),
      image_metadata: images,
      cover_image_url: coverImage || images[0]?.url || null,
      status: nextStatus,
      author_id: existing?.author_id || currentUser.id,
      published_at: nextStatus === 'published' ? (existing?.published_at || new Date().toISOString()) : null,
      updated_at: new Date().toISOString(),
    };

    const result = editingId
      ? await supabase.from('news').update(payload).eq('id', editingId)
      : await supabase.from('news').insert({ ...payload, created_at: new Date().toISOString() });

    if (result.error) {
      toast.error(`No se pudo guardar la noticia: ${result.error.message}`);
    } else {
      toast.success(nextStatus === 'published' ? 'Noticia publicada.' : 'Borrador guardado.');
      setForm(prev => ({ ...prev, status: nextStatus }));
      await loadPosts();
      if (!editingId) resetEditor();
    }
    setSaving(false);
  };

  const deletePost = async (post) => {
    if (!window.confirm(`¿Eliminar “${post.title}”? Esta acción también eliminará sus likes, comentarios y registros de compartido.`)) return;
    const { error } = await supabase.from('news').delete().eq('id', post.id);
    if (error) toast.error(`No se pudo eliminar la noticia: ${error.message}`);
    else {
      toast.success('Noticia eliminada.');
      if (editingId === post.id) resetEditor();
      await loadPosts();
    }
  };

  if (access === 'checking' || (access === 'allowed' && loading)) {
    return <div className="min-h-screen bg-gray-900 p-10 text-center text-gray-300">Cargando noticias…</div>;
  }
  if (access !== 'allowed') {
    return <div className="min-h-screen bg-gray-900 p-10 text-center text-gray-300">Esta sección es privada.</div>;
  }

  return <>
    <Head><title>Noticias · NorthBikers</title></Head>
    <ToastContainer theme="dark" />
    <main className="min-h-screen bg-gray-900 px-3 py-5 text-gray-100 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-amber-400">Administración privada</p>
            <h1 className="mt-1 text-3xl font-bold">Noticias NorthBikers</h1>
            <p className="mt-1 text-sm text-gray-400">Crea noticias con imágenes, portada y contenido listo para reacciones de la comunidad.</p>
          </div>
          <button onClick={resetEditor} className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-600"><FiPlus /> Nueva noticia</button>
        </header>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.8fr)]">
          <section className="rounded-2xl border border-gray-700 bg-gray-800/70 p-4 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div><h2 className="text-xl font-bold">{editingId ? 'Editar noticia' : 'Crear noticia'}</h2><p className="mt-1 text-xs text-gray-400">Las imágenes se insertan en el punto actual del texto y pueden llevar pie de foto.</p></div>
              {editingId && <span className="rounded-full bg-gray-700 px-3 py-1 text-xs">ID {editingId}</span>}
            </div>

            <label className="mb-1 block text-sm font-semibold">Título</label>
            <input value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} className="mb-4 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white" placeholder="Título de la noticia" />

            <label className="mb-1 block text-sm font-semibold">Resumen</label>
            <textarea rows={2} maxLength={300} value={form.extract} onChange={e => setForm(prev => ({ ...prev, extract: e.target.value }))} className="mb-4 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white" placeholder="Una síntesis breve para tarjetas y notificaciones" />

            <div className="mb-3 flex flex-col gap-3 rounded-xl border border-gray-700 bg-gray-900/70 p-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-xs font-bold text-gray-300">Añadir imagen al artículo</label>
                <input ref={imageInputRef} type="file" accept="image/*" onChange={e => setPendingFile(e.target.files?.[0] || null)} className="block w-full text-xs text-gray-400 file:mr-3 file:rounded file:border-0 file:bg-gray-700 file:px-3 file:py-2 file:text-gray-100" />
              </div>
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-xs font-bold text-gray-300">Pie de foto</label>
                <input value={imageCaption} onChange={e => setImageCaption(e.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white" placeholder="Descripción de la imagen (opcional)" />
              </div>
              <button onClick={uploadAndInsertImage} disabled={!pendingFile || uploading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold hover:bg-indigo-500 disabled:opacity-50"><FiUpload />{uploading ? 'Subiendo…' : 'Subir e insertar'}</button>
            </div>

            <div className="news-editor overflow-hidden rounded-lg border border-gray-600 bg-white text-gray-900">
              <ReactQuill ref={editorRef} theme="snow" value={form.body} onChange={body => setForm(prev => ({ ...prev, body }))} modules={QUILL_MODULES} placeholder="Escribe la noticia…" />
            </div>

            <section className="mt-5 rounded-xl border border-gray-700 bg-gray-900/50 p-4">
              <div className="mb-3 flex items-center gap-2"><FiImage className="text-amber-400" /><h3 className="font-bold">Imágenes y portada</h3><span className="text-xs text-gray-500">{images.length}</span></div>
              {!images.length ? <p className="text-sm text-gray-500">Sube imágenes desde el editor. La primera se asigna como portada automáticamente.</p> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {images.map((image, index) => <div key={`${image.url}-${index}`} className={`overflow-hidden rounded-lg border ${coverImage === image.url ? 'border-amber-400 ring-1 ring-amber-400/40' : 'border-gray-700'}`}>
                  <img src={image.url} alt={image.caption || `Imagen ${index + 1}`} className="h-28 w-full object-cover" />
                  <div className="p-2"><p className="line-clamp-2 min-h-8 text-[11px] text-gray-300">{image.caption || 'Sin pie de foto'}</p><button onClick={() => setCoverImage(image.url)} className={`mt-2 w-full rounded px-2 py-1 text-[10px] font-bold ${coverImage === image.url ? 'bg-amber-400 text-gray-900' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}>{coverImage === image.url ? 'Portada' : 'Usar como portada'}</button></div>
                </div>)}
              </div>}
            </section>

            <div className="mt-5 flex flex-col gap-3 border-t border-gray-700 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-300"><span>Estado</span><select value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))} className="rounded border border-gray-600 bg-gray-900 px-3 py-2 text-white"><option value="draft">Borrador</option><option value="published">Publicada</option><option value="archived">Archivada</option></select></label>
              <div className="flex flex-col gap-2 sm:flex-row">
                {editingId && <button onClick={resetEditor} className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-600"><FiArrowLeft /> Cancelar</button>}
                <button onClick={() => savePost(form.status)} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-500 px-4 py-2 text-sm font-bold text-gray-100 hover:bg-gray-700 disabled:opacity-50"><FiSave /> Guardar cambios</button>
                <button onClick={() => savePost('published')} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-black text-gray-900 hover:bg-amber-300 disabled:opacity-50"><FiEye /> Publicar</button>
              </div>
            </div>
          </section>

          <aside className="space-y-3">
            <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Noticias existentes</h2><button onClick={loadPosts} className="text-xs text-blue-300 hover:text-blue-200">Actualizar</button></div>
            {posts.length === 0 ? <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center text-sm text-gray-500">Aún no hay noticias.</div> : posts.map(post => <article key={post.id} className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
              {(post.cover_image_url || post.images?.[0]) && <img src={post.cover_image_url || post.images[0]} alt="" className="h-36 w-full object-cover" />}
              <div className="p-4">
                <div className="mb-2 flex items-start justify-between gap-2"><h3 className="font-bold leading-snug">{post.title || 'Sin título'}</h3><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold uppercase ${post.status === 'published' ? 'bg-emerald-900 text-emerald-200' : post.status === 'archived' ? 'bg-gray-700 text-gray-300' : 'bg-amber-900 text-amber-200'}`}>{post.status === 'published' ? 'Publicada' : post.status === 'archived' ? 'Archivada' : 'Borrador'}</span></div>
                <p className="line-clamp-2 text-xs text-gray-400">{post.extract}</p>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-500"><span>{post.likes_count || 0} Me gusta</span><span>{post.comments_count || 0} comentarios</span><span>{post.shares_count || 0} compartidos</span></div>
                <div className="mt-4 flex gap-2"><button onClick={() => editPost(post)} className="flex-1 rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold hover:bg-blue-600">Editar</button><button onClick={() => deletePost(post)} title="Eliminar noticia" className="rounded-lg border border-red-800 px-3 py-2 text-red-300 hover:bg-red-900/30"><FiTrash2 /></button></div>
              </div>
            </article>)}
          </aside>
        </div>

        <section className="mt-8 rounded-2xl border border-gray-700 bg-gray-800/40 p-4 sm:p-5">
          <div className="flex items-start gap-3"><FiFilePlus className="mt-1 text-amber-400" /><div><h2 className="font-bold">Interacciones listas para la app</h2><p className="mt-1 text-sm text-gray-400">Cada noticia incluye contadores de Me gusta, compartidos y comentarios. La app puede guardar interacciones en <code>news_likes</code>, <code>news_shares</code> y <code>news_comments</code>.</p></div></div>
        </section>
      </div>
    </main>
  </>;
}
