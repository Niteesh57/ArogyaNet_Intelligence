
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usersApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, Upload, User as UserIcon, Camera, Save } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const Profile = () => {
    const { user, updateProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        phone_number: "",
        password: "",
        confirmPassword: "",
    });

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                full_name: user.full_name || "",
                email: user.email || "",
                phone_number: user.phone_number || "",
            }));
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            const { data } = await usersApi.uploadImage(file);
            toast.success("Profile picture updated successfully");
            await updateProfile({ image: data.image_url });
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload image");
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password && formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        try {
            setLoading(true);
            const updateData: any = {
                full_name: formData.full_name,
                phone_number: formData.phone_number,
            };

            if (formData.password) {
                updateData.password = formData.password;
            }

            // Explicitly call API first
            await usersApi.updateMe(updateData);

            // Then update context
            await updateProfile(updateData);

            setFormData(prev => ({ ...prev, password: "", confirmPassword: "" }));
            toast.success("Profile updated successfully");
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.detail || "Failed to update profile";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="container max-w-4xl mx-auto py-8 space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
                <p className="text-muted-foreground mt-2">
                    Manage your profile information and security settings.
                </p>
            </div>

            <div className="grid gap-8 md:grid-cols-[300px_1fr]">
                {/* Sidebar / Image Section */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile Picture</CardTitle>
                            <CardDescription>Click to upload a new photo</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-6">
                            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <Avatar className="w-40 h-40 border-4 border-background shadow-xl transition-transform group-hover:scale-105">
                                    <AvatarImage src={user.image} className="object-cover" />
                                    <AvatarFallback className="text-4xl bg-muted">{user.full_name?.[0] || user.email[0]}</AvatarFallback>
                                </Avatar>
                                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="w-8 h-8 text-white" />
                                </div>
                                {uploading && (
                                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/50">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                )}
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={uploading}
                            />
                            <div className="text-center space-y-1">
                                <p className="font-medium text-lg">{user.full_name || "User"}</p>
                                <p className="text-sm text-muted-foreground capitalize">{user.role.replace("_", " ")}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Form Section */}
                <div className="space-y-6">
                    <form onSubmit={handleSubmit}>
                        <Card>
                            <CardHeader>
                                <CardTitle>Profile Information</CardTitle>
                                <CardDescription>Update your personal details</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        disabled
                                        className="bg-muted text-muted-foreground"
                                    />
                                    <p className="text-[0.8rem] text-muted-foreground">
                                        Email address cannot be changed. Contact admin for assistance.
                                    </p>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="full_name">Full Name</Label>
                                    <Input
                                        id="full_name"
                                        name="full_name"
                                        value={formData.full_name}
                                        onChange={handleChange}
                                        placeholder="Enter your full name"
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="phone_number">Phone Number</Label>
                                    <Input
                                        id="phone_number"
                                        name="phone_number"
                                        value={formData.phone_number}
                                        onChange={handleChange}
                                        placeholder="+1 (555) 000-0000"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle>Security</CardTitle>
                                <CardDescription>Update your password</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="password">New Password</Label>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Leave blank to keep current password"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                    <Input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="Confirm new password"
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end pt-4">
                                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {!loading && <Save className="mr-2 h-4 w-4" />}
                                    Save Changes
                                </Button>
                            </CardFooter>
                        </Card>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Profile;
