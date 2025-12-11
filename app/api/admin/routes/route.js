import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Route from '@/models/Route';

// Force dynamic
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/routes
 * Create a new route
 */
export async function POST(request) {
    try {
        await connectDB();

        // Check Admin Role
        const role = request.headers.get('x-user-role');
        if (role !== 'admin') {
            return NextResponse.json(
                { success: false, message: 'Forbidden: Admin access only' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { route_name, areas } = body;

        // Validate required fields
        if (!route_name) {
            return NextResponse.json(
                { success: false, message: 'Route name is required' },
                { status: 400 }
            );
        }

        // Create route
        const route = await Route.create({
            route_name,
            areas: areas || []
        });

        return NextResponse.json({
            success: true,
            message: 'Route created successfully',
            data: route
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating route:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Server error' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/admin/routes
 * List all routes
 */
export async function GET(request) {
    try {
        await connectDB();

        // Check Admin Role
        const role = request.headers.get('x-user-role');
        if (role !== 'admin') {
            return NextResponse.json(
                { success: false, message: 'Forbidden: Admin access only' },
                { status: 403 }
            );
        }

        const routes = await Route.find()
            .populate('assigned_delivery_boy', 'name mobile')
            .lean();

        return NextResponse.json({
            success: true,
            message: 'Routes retrieved successfully',
            data: routes
        });

    } catch (error) {
        console.error('Error fetching routes:', error);
        return NextResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
        );
    }
}
