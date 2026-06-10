import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import { Organization } from '@/models/Organization';
import { getLimitForTier } from '@/lib/subscription';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const organization = await Organization.findById(id);
    if (!organization) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    return NextResponse.json(organization);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const organization = await Organization.findById(id);
    if (!organization) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const body = await req.json();
    const { name, type, settings, tax_id, billing_plan, billing_rates, subscription_tier, max_users_limit, logo_url } = body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (type) updateData.type = type;
    if (tax_id !== undefined) updateData.tax_id = tax_id || null;
    
    if (logo_url !== undefined && logo_url !== organization.logo_url) {
      updateData.logo_url = logo_url || null;
      if (!logo_url && organization.logo_url) {
        const { deleteFromR2 } = require('@/lib/r2');
        try {
          await deleteFromR2(organization.logo_url);
        } catch (err: any) {
          console.error("Error al borrar logo de R2 al actualizar:", err.message);
        }
      }
    }

    if (settings) updateData.settings = settings;
    if (billing_plan !== undefined) updateData.billing_plan = billing_plan;
    if (billing_rates !== undefined) updateData.billing_rates = billing_rates;

    if (subscription_tier !== undefined) {
      updateData.subscription_tier = subscription_tier;
      if (max_users_limit === undefined) {
        const orgType = type || organization.type || 'default';
        updateData.max_users_limit = getLimitForTier(orgType, subscription_tier);
      }
    }

    if (max_users_limit !== undefined) {
      updateData.max_users_limit = max_users_limit;
    }

    const updatedOrganization = await Organization.findByIdAndUpdate(id, updateData, { new: true });
    return NextResponse.json({ message: 'Organization updated', organization: updatedOrganization });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const deletedOrganization = await Organization.findByIdAndDelete(id);
    if (!deletedOrganization) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    // Attempt to delete logo in Cloudflare R2
    try {
      if (deletedOrganization.logo_url) {
        const { deleteFromR2 } = require("@/lib/r2");
        await deleteFromR2(deletedOrganization.logo_url);
      }
    } catch (e: any) {
      console.log("[R2 cleanup] failed on organization deletion:", e.message);
    }

    return NextResponse.json({ message: 'Organization deleted', organization: deletedOrganization });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
