import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: deliverableId } = await params;

    // Get files from deliverable_files table
    const { data: files, error } = await supabase
      .from("deliverable_files")
      .select(
        `
        id,
        file_name,
        file_size,
        file_type,
        storage_path,
        uploaded_at,
        uploaded_by,
        users!deliverable_files_uploaded_by_fkey(id, name, email, avatar_url)
      `
      )
      .eq("deliverable_id", deliverableId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get signed URLs for files (private bucket)
    const filesWithUrls = await Promise.all(
      (files || []).map(async (file: any) => {
        const { data: signedUrlData } = await supabase.storage
          .from("submissions")
          .createSignedUrl(file.storage_path, 3600); // 1 hour expiry

        return {
          id: file.id,
          fileName: file.file_name,
          fileSize: file.file_size,
          fileType: file.file_type,
          storagePath: file.storage_path,
          fileUrl: signedUrlData?.signedUrl || null,
          uploadedAt: file.uploaded_at,
          uploadedBy: file.users,
        };
      })
    );

    return NextResponse.json(filesWithUrls);
  } catch (error: any) {
    console.error("Error fetching files:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: deliverableId } = await params;
    const { fileId } = await request.json();

    if (!fileId) {
      return NextResponse.json(
        { error: "fileId is required" },
        { status: 400 }
      );
    }

    // Get file details
    const { data: file, error: fetchError } = await supabase
      .from("deliverable_files")
      .select("storage_path")
      .eq("id", fileId)
      .eq("deliverable_id", deliverableId)
      .single();

    if (fetchError || !file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("submissions")
      .remove([file.storage_path]);

    if (storageError) {
      console.error("Storage error:", storageError);
      return NextResponse.json(
        { error: "Failed to delete file from storage" },
        { status: 500 }
      );
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from("deliverable_files")
      .delete()
      .eq("id", fileId)
      .eq("deliverable_id", deliverableId);

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Failed to delete file record" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "File deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
