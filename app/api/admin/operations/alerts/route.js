import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Delivery from '@/models/Delivery';
import Route from '@/models/Route';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/operations/alerts
 * Get operational alerts: Failed deliveries, inactive delivery boys, delays
 */
export async function GET(request) {
    try {
        await connectDB();

        // Check for admin role
        const role = request.headers.get('x-user-role');
        if (role !== 'admin') {
            return NextResponse.json(
                { success: false, message: 'Forbidden: Admin access required' },
                { status: 403 }
            );
        }

        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const alerts = [];

        // 1. Alert: Failed Deliveries Today
        // High Priority
        const failedDeliveries = await Delivery.find({
            date: { $gte: startOfDay, $lte: endOfDay },
            status: 'not_delivered'
        })
            .populate('delivery_boy_id', 'name mobile')
            .populate('customer_id', 'name mobile')
            .lean();

        failedDeliveries.forEach(d => {
            alerts.push({
                type: 'failed_delivery',
                severity: 'high',
                message: `Delivery failed for ${d.customer_id?.name || 'Customer'} (Boy: ${d.delivery_boy_id?.name || 'Unknown'})`,
                timestamp: d.created_at,
                metadata: {
                    delivery_id: d._id,
                    reason: d.notes || 'No reason provided'
                }
            });
        });

        // 2. Alert: Inactive Delivery Boys
        // Medium Priority if assigned but no action
        const routes = await Route.find({ assigned_delivery_boy: { $ne: null } }).lean();
        const assignedBoyIds = [...new Set(routes.map(r => r.assigned_delivery_boy.toString()))];

        // Find which boys have done at least 1 delivery today
        const activeBoyIds = await Delivery.distinct('delivery_boy_id', {
            date: { $gte: startOfDay, $lte: endOfDay }
        });
        const activeBoyIdStrings = activeBoyIds.map(id => id.toString());

        // Identifying inactive boys (assigned but no deliveries yet)
        // Only trigger this if it's late in the day? (e.g. > 10 AM)
        const currentHour = today.getHours();
        if (currentHour >= 10) { // Assume operations start by 10 AM
            const inactiveBoys = assignedBoyIds.filter(id => !activeBoyIdStrings.includes(id));

            if (inactiveBoys.length > 0) {
                const boys = await User.find({ _id: { $in: inactiveBoys } }).select('name mobile').lean();

                boys.forEach(b => {
                    alerts.push({
                        type: 'inactive_delivery_boy',
                        severity: 'medium',
                        message: `Delivery Boy ${b.name} has assigned route but no deliveries today`,
                        timestamp: new Date(),
                        metadata: {
                            delivery_boy_id: b._id,
                            mobile: b.mobile
                        }
                    });
                });
            }
        }

        // 3. Alert: Routes Behind Schedule
        // (Simplified logic: If time > 4 PM and completion < 50%)
        // This requires expensive calculation (same as dashboard).
        // Optimization: Use a simpler heuristic or skip if too heavy. 
        // Let's do a simple check on "Pending" deliveries if we had status.
        // Since we don't store "Pending" state in DB, we'd need to re-calculate schedule.
        // For MVP, we'll skip complex delayed route calculation here to keep response fast,
        // or rely on the dashboard for that visual.
        // Instead, let's alert on "Partial" deliveries as 'low' severity.

        const partialDeliveries = await Delivery.find({
            date: { $gte: startOfDay, $lte: endOfDay },
            status: 'partial'
        })
            .populate('delivery_boy_id', 'name')
            .lean();

        partialDeliveries.forEach(d => {
            alerts.push({
                type: 'partial_delivery',
                severity: 'low',
                message: `Partial delivery for customer. Boy: ${d.delivery_boy_id?.name}`,
                timestamp: d.created_at,
                metadata: { delivery_id: d._id }
            });
        });

        // Sort by severity (high -> medium -> low)
        const severityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
        alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

        return NextResponse.json({
            success: true,
            data: alerts,
            meta: {
                total: alerts.length,
                high: alerts.filter(a => a.severity === 'high').length,
                medium: alerts.filter(a => a.severity === 'medium').length,
                low: alerts.filter(a => a.severity === 'low').length
            }
        });

    } catch (error) {
        console.error('Error fetching alerts:', error);
        return NextResponse.json(
            { success: false, message: 'Server error fetching alerts' },
            { status: 500 }
        );
    }
}
