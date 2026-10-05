Deno.serve(() => new Response(JSON.stringify({ error: 'disabled' }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
