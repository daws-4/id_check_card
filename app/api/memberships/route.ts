import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/config/db';
import mongoose, { Model } from 'mongoose';
import { Membership as MembershipModel, IMembership } from '@/models/Membership';
import { User } from '@/models/User';
import { Organization } from '@/models/Organization';

const Membership = MembershipModel;

export async function GET(req: Request) {
  try {
    await connectDB();
    const url = new URL(req.url);
    const organization_id = url.searchParams.get("organization_id");
    const user_id = url.searchParams.get("user_id");
    const search = url.searchParams.get("search");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "15");
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (organization_id && mongoose.Types.ObjectId.isValid(organization_id)) {
      filter.organization_id = new mongoose.Types.ObjectId(organization_id);
    }
    if (user_id && mongoose.Types.ObjectId.isValid(user_id)) {
      filter.user_id = new mongoose.Types.ObjectId(user_id);
    }

    // We'll use aggregation to search inside the populated user_id
    const pipeline: any[] = [{ $match: filter }];

    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'user_id',
        foreignField: '_id',
        as: 'user'
      }
    });
    pipeline.push({ $unwind: '$user' });

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'user.name': { $regex: search, $options: 'i' } },
            { 'user.last_name': { $regex: search, $options: 'i' } },
            { 'user.email': { $regex: search, $options: 'i' } },
            { 'user.document_id': { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    pipeline.push({
      $lookup: {
        from: 'organizations',
        localField: 'organization_id',
        foreignField: '_id',
        as: 'organization'
      }
    });
    pipeline.push({ $unwind: '$organization' });

    const totalPipeline = [...pipeline, { $count: 'total' }];
    const totalResult = await Membership.aggregate(totalPipeline);
    const total = totalResult[0]?.total || 0;

    pipeline.push({ $sort: { createdAt: -1 } });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    const results = await Membership.aggregate(pipeline);

    // Map fields for frontend compatibility
    const memberships = results.map(r => ({
      ...r,
      user_id: r.user,
      organization_id: r.organization
    }));

    return NextResponse.json({
      memberships,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error: any) {
    console.error("GET MEMBERSHIPS ERROR:", error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { user_id, organization_id, role } = body;

    if (!user_id || !organization_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingMembership = await Membership.findOne({ user_id, organization_id });
    if (existingMembership) {
      return NextResponse.json({ error: 'Membership already exists' }, { status: 409 });
    }

    const newMembership = await Membership.create({
      user_id,
      organization_id,
      role: role || 'user'
    });

    return NextResponse.json({ message: 'Membership created', membership: newMembership }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
