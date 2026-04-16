package com.aryogasutra.controller;

import com.aryogasutra.dto.PatientDto;
import com.aryogasutra.dto.PatientUpdateRequest;
import com.aryogasutra.service.PatientService;
import com.aryogasutra.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientService patientService;

    @GetMapping
    public List<PatientDto> listAll() {
        return patientService.listAll(SecurityUtils.currentUser());
    }

    @GetMapping("/me")
    public PatientDto me() {
        return patientService.getMine(SecurityUtils.currentUser());
    }

    @GetMapping("/{id}")
    public PatientDto getById(@PathVariable Long id) {
        return patientService.getById(id, SecurityUtils.currentUser());
    }

    @PutMapping("/me")
    public PatientDto updateMe(@Valid @RequestBody PatientUpdateRequest request) {
        return patientService.updateMine(request);
    }

    @PostMapping(value = "/me/report", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PatientDto uploadReport(@RequestPart("file") MultipartFile file) throws IOException {
        return patientService.uploadReport(file);
    }
}
