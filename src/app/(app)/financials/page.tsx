"use client";

import React, { useState, useMemo } from "react";
import { db } from "@/data/api";
import { Payment, Bid, Project, Contact } from "@/data/types";
import { findContactName } from "@/lib/contact-display";
import { useCompany } from "@/providers/company-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Receipt,
  AlertCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function FinancialsPage() {
  const { currentCompanyId } = useCompany();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [revenueTimeframe, setRevenueTimeframe] = useState("6months");

  // Load data on mount
  React.useEffect(() => {
    async function load() {
      const [p, b, pr, c] = await Promise.all([
        db.Payment.filter({ company_id: currentCompanyId }),
        db.Bid.filter({ company_id: currentCompanyId }),
        db.Project.filter({ company_id: currentCompanyId }),
        db.Contact.filter({ company_id: currentCompanyId }),
      ]);
      setPayments(p);
      setBids(b);
      setProjects(pr);
      setContacts(c);
      setLoading(false);
    }
    load();
  }, [currentCompanyId]);

  // Revenue stats
  const stats = useMemo(() => {
    const succeeded = payments.filter((p) => p.status === "succeeded");
    const totalRevenue = succeeded.reduce((sum, p) => sum + (p.amount || 0), 0);
    const outstanding = payments
      .filter((p) => p.status === "unpaid" || p.status === "processing")
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const failed = payments
      .filter((p) => p.status === "failed")
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const avgBid =
      bids.length > 0
        ? bids.reduce((sum, b) => sum + (b.bid_total || 0), 0) / bids.length
        : 0;
    const acceptedBids = bids.filter((b) => b.status === "accepted").length;
    const totalBids = bids.length;
    const closeRate = totalBids > 0 ? ((acceptedBids / totalBids) * 100).toFixed(0) : "0";

    return { totalRevenue, outstanding, failed, avgBid, acceptedBids, totalBids, closeRate };
  }, [payments, bids]);

  // Monthly revenue chart data
  const revenueChartData = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    const monthCount = revenueTimeframe === "12months" ? 12 : 6;

    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = 0;
    }

    payments
      .filter((p) => p.status === "succeeded" && p.paid_date)
      .forEach((p) => {
        const d = new Date(p.paid_date!);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (months[key] !== undefined) {
          months[key] += p.amount || 0;
        }
      });

    return Object.entries(months).map(([key, amount]) => {
      const [y, m] = key.split("-");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return {
        month: `${monthNames[parseInt(m) - 1]} ${y.slice(2)}`,
        revenue: amount,
      };
    });
  }, [payments, revenueTimeframe]);

  // Payment status pie chart
  const statusChartData = useMemo(() => {
    const statusCounts: Record<string, { count: number; amount: number }> = {};
    payments.forEach((p) => {
      const s = p.status || "unpaid";
      if (!statusCounts[s]) statusCounts[s] = { count: 0, amount: 0 };
      statusCounts[s].count++;
      statusCounts[s].amount += p.amount || 0;
    });
    return Object.entries(statusCounts).map(([status, data]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: data.amount,
      count: data.count,
    }));
  }, [payments]);

  // Recent payments
  const recentPayments = useMemo(() => {
    return [...payments]
      .sort(
        (a, b) =>
          new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
      )
      .slice(0, 8);
  }, [payments]);

  const getContactName = (contactId: string) => findContactName(contacts, contactId);

  const statusColor = (status: string) => {
    switch (status) {
      case "succeeded":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/40";
      case "processing":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/40";
      case "unpaid":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/40";
      case "failed":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/40";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700/40";
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Financials</h1>
          <p className="text-muted-foreground mt-2">
            Revenue tracking, payment status, and business performance
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-800/40">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${stats.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 dark:from-amber-950/20 dark:to-yellow-950/20 dark:border-amber-800/40">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Outstanding</p>
                  <p className="text-2xl font-bold text-amber-600">
                    ${stats.outstanding.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                  <Receipt className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 dark:from-blue-950/20 dark:to-indigo-950/20 dark:border-blue-800/40">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Average Bid</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${stats.avgBid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 dark:from-purple-950/20 dark:to-violet-950/20 dark:border-purple-800/40">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Close Rate</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.closeRate}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.acceptedBids}/{stats.totalBids} bids
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-violet-500 rounded-full flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList className="bg-card border border-border shadow-sm">
            <TabsTrigger
              value="revenue"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white"
            >
              Revenue
            </TabsTrigger>
            <TabsTrigger
              value="status"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white"
            >
              Payment Status
            </TabsTrigger>
            <TabsTrigger
              value="recent"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white"
            >
              Recent Payments
            </TabsTrigger>
          </TabsList>

          {/* Revenue Chart */}
          <TabsContent value="revenue">
            <Card className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-card-header-from to-card-header-to border-b border-border">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Monthly Revenue
                </CardTitle>
                <Select value={revenueTimeframe} onValueChange={setRevenueTimeframe}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6months">Last 6 Months</SelectItem>
                    <SelectItem value="12months">Last 12 Months</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(value: number) => [
                          `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
                          "Revenue",
                        ]}
                      />
                      <Bar
                        dataKey="revenue"
                        fill="#22c55e"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Status Pie */}
          <TabsContent value="status">
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-card-header-from to-card-header-to border-b border-border">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-green-600" />
                  Payments by Status
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[350px]">
                  {statusChartData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No payment data
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusChartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {statusChartData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [
                            `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
                          ]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Payments */}
          <TabsContent value="recent">
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-card-header-from to-card-header-to border-b border-border">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Recent Payments
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {recentPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="p-4 flex items-center justify-between hover:bg-accent transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-medium text-foreground">
                            {getContactName(payment.contact_id)}
                          </p>
                          <Badge variant="outline" className={statusColor(payment.status)}>
                            {payment.status}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {payment.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {payment.description || "Payment"}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p
                          className={`text-lg font-semibold ${
                            payment.status === "succeeded"
                              ? "text-green-600"
                              : payment.status === "failed"
                                ? "text-red-500"
                                : "text-foreground"
                          }`}
                        >
                          ${payment.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                        {payment.paid_date && (
                          <p className="text-xs text-muted-foreground">
                            Paid {new Date(payment.paid_date).toLocaleDateString()}
                          </p>
                        )}
                        {payment.due_date && !payment.paid_date && (
                          <p className="text-xs text-muted-foreground">
                            Due {new Date(payment.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {recentPayments.length === 0 && (
                    <div className="p-12 text-center">
                      <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">No payments yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
