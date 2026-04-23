import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY') || '';

serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { path, params = {} } = await req.json();
    
    if (!path) {
      return new Response(
        JSON.stringify({ error: 'Missing path parameter' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
    
    // 构建 TMDB URL
    const url = new URL(`https://api.themoviedb.org/3${path}`);
    url.searchParams.append('api_key', TMDB_API_KEY);
    url.searchParams.append('language', 'zh-CN');
    
    // 添加其他参数
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'api_key' && key !== 'language') {
        url.searchParams.append(key, String(value));
      }
    });

    console.log('Proxying to TMDB:', path);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('TMDB API error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ 
          error: 'TMDB API error',
          status: response.status,
          statusText: response.statusText 
        }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
