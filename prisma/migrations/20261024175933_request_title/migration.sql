/*
  Warnings:

  - Added the required column `title` to the `EmployeeRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EmployeeRequest" ADD COLUMN     "title" TEXT NOT NULL;
