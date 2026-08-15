import { authenticatedContext, ensureCanonicalCustomer } from '../../shared/identityAuth.ts';
import { authenticatedRole, customerAccountDto, isAdmin } from '../../shared/identityPolicy.ts';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const context = await authenticatedContext(req);
    if (!context.user) return Response.json({ authenticated: false, role: null, features: {} });

    const role = authenticatedRole(context.user);
    const flags = await context.entities.FeatureFlag.list('key', 500).catch(() => []);
    const features = Object.fromEntries(flags
      .filter((flag: any) => flag.enabled && (flag.audience === 'all' || flag.audience === role))
      .map((flag: any) => [flag.key, true]));

    if (isAdmin(context.user)) {
      return Response.json({
        authenticated: true,
        role: 'admin',
        identity_version: 2,
        account: { id: context.user.id, name: context.user.full_name || '', email: context.user.email || '' },
        features,
      });
    }

    const customer = await ensureCanonicalCustomer(context.entities, context.user, {}, 'authenticated_signup');
    return Response.json({
      authenticated: true,
      role: 'customer',
      identity_version: 2,
      account: customerAccountDto(customer, context.user),
      features,
    });
  } catch (error) {
    if (error?.code === 'PHONE_VERIFICATION_REQUIRED') {
      return Response.json({
        error: 'Verify your mobile number before creating a customer account.',
        code: 'PHONE_VERIFICATION_REQUIRED',
      }, { status: 403 });
    }
    console.error('[appBootstrap] failed', error?.message || String(error));
    return Response.json({ error: 'Application bootstrap failed.' }, { status: 500 });
  }
});
