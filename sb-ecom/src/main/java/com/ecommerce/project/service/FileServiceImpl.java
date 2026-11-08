package com.ecommerce.project.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class FileServiceImpl implements FileService {

    @Override
    public String uploadImage(String path, MultipartFile file) throws IOException {
        String originalFileName = file.getOriginalFilename();
        if (originalFileName == null || !originalFileName.contains(".")) {
            throw new IOException("Uploaded image must have a file extension");
        }
        String randomId = UUID.randomUUID().toString();
        String fileName = randomId.concat(originalFileName.substring(originalFileName.lastIndexOf(".")));
        Path folder = Paths.get(path);
        Files.createDirectories(folder);
        Files.copy(file.getInputStream(), folder.resolve(fileName));
        return fileName;
    }

    @Override
    public void deleteImage(String path, String fileName) throws IOException {
        Path folder = Paths.get(path).toAbsolutePath().normalize();
        Path imagePath = folder.resolve(fileName).normalize();
        if (!imagePath.startsWith(folder)) {
            throw new IOException("Invalid image path");
        }
        Files.deleteIfExists(imagePath);
    }
}
